import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, type FunctionDeclaration, type Content } from '@google/genai';
import {
  CATALOG,
  getProductById,
  getBagItemDetails,
  calculateBagSubtotal,
  type BagItem,
  type PartyBrief,
  type AgentActionLog,
  type ProductCategory,
  type DietaryTag,
  type CheckoutDetails,
  type OrderConfirmation,
  type VoiceClientAction,
} from './src/shared/catalog.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const searchCatalogDeclaration: FunctionDeclaration = {
  name: 'search_catalog',
  description:
    'Search and filter the CymbalMart party catalog by category, keyword, dietary tag, or max unit price. Always call this before adding or swapping items to verify exact product IDs, prices, and serving yields.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      category: {
        type: Type.STRING,
        description:
          'Optional category filter: "Tableware & Linens", "Decor & Florals", "Food & Catering", "Drinks & Barware", or "Favors & Games".',
      },
      query: {
        type: Type.STRING,
        description: 'Optional keyword search across product names, descriptions, and themes.',
      },
      dietaryTag: {
        type: Type.STRING,
        description: 'Optional dietary tag filter: "vegan", "gluten-free", "nut-free", or "non-alcoholic".',
      },
      maxPrice: {
        type: Type.NUMBER,
        description: 'Optional maximum unit price in USD.',
      },
    },
  },
};

const updateShoppingBagDeclaration: FunctionDeclaration = {
  name: 'update_shopping_bag',
  description:
    'Add, adjust quantities, remove, or replace items in the user shopping bag. Use action "replace_all" when building a fresh full party plan from a brief, "add" to increment or insert items, "set_quantity" to set an exact quantity, or "remove" to delete items.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        description: 'One of: "add", "set_quantity", "remove", "replace_all".',
      },
      items: {
        type: Type.ARRAY,
        description: 'List of product updates to apply.',
        items: {
          type: Type.OBJECT,
          properties: {
            productId: {
              type: Type.STRING,
              description: 'Exact catalog product ID.',
            },
            quantity: {
              type: Type.NUMBER,
              description: 'Desired quantity (integer >= 1 for add/set_quantity/replace_all).',
            },
            note: {
              type: Type.STRING,
              description: 'Brief 4-8 word rationale (e.g., "Scaled for 16 guests").',
            },
          },
          required: ['productId', 'quantity'],
        },
      },
    },
    required: ['action', 'items'],
  },
};

const updatePartyBriefDeclaration: FunctionDeclaration = {
  name: 'update_party_brief',
  description:
    'Update the user party planning brief when the user mentions a new guest count, budget, occasion, theme, venue, dietary requirement, or special request in chat.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      occasion: { type: Type.STRING },
      theme: { type: Type.STRING },
      guestCount: { type: Type.NUMBER },
      budgetLimit: { type: Type.NUMBER },
      dietaryNeeds: { type: Type.STRING },
      specialRequests: { type: Type.STRING },
      venueType: { type: Type.STRING },
    },
  },
};

function executeSearchCatalog(args: {
  category?: string;
  query?: string;
  dietaryTag?: string;
  maxPrice?: number;
}) {
  let results = [...CATALOG];
  if (args.category) {
    const catLower = args.category.toLowerCase();
    results = results.filter((p) => p.category.toLowerCase().includes(catLower));
  }
  if (args.dietaryTag) {
    const tagLower = args.dietaryTag.toLowerCase() as DietaryTag;
    results = results.filter((p) => p.dietaryTags.includes(tagLower));
  }
  if (typeof args.maxPrice === 'number' && !Number.isNaN(args.maxPrice)) {
    results = results.filter((p) => p.price <= args.maxPrice!);
  }
  if (args.query) {
    const q = args.query.toLowerCase();
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.themes.some((t) => t.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q)
    );
  }
  return results.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.price,
    unitLabel: p.unitLabel,
    servesCount: p.servesCount,
    dietaryTags: p.dietaryTags,
    themes: p.themes,
    description: p.description,
  }));
}

function executeUpdateShoppingBag(
  currentBag: BagItem[],
  args: {
    action: string;
    items: Array<{ productId: string; quantity: number; note?: string }>;
  }
): { nextBag: BagItem[]; logs: AgentActionLog[]; summaryResult: unknown } {
  let nextBag = currentBag.map((i) => ({ ...i }));
  const logs: AgentActionLog[] = [];
  const warnings: string[] = [];

  if (args.action === 'replace_all') {
    nextBag = [];
    logs.push({
      type: 'cleared',
      summary: 'Curated a fresh shopping plan for your brief',
    });
  }

  for (const entry of args.items || []) {
    const product = getProductById(entry.productId);
    if (!product) {
      warnings.push(`Unknown productId: ${entry.productId}`);
      continue;
    }
    const qty = Math.max(0, Math.round(Number(entry.quantity) || 0));
    const existingIdx = nextBag.findIndex((i) => i.productId === entry.productId);

    if (args.action === 'remove' || qty === 0) {
      if (existingIdx !== -1) {
        const prevQty = nextBag[existingIdx].quantity;
        nextBag.splice(existingIdx, 1);
        logs.push({
          type: 'removed',
          productId: product.id,
          quantity: prevQty,
          deltaAmount: -(product.price * prevQty),
          summary: `Removed ${prevQty}× ${product.name}`,
        });
      }
      continue;
    }

    if (args.action === 'add') {
      const addQty = Math.max(1, qty);
      if (existingIdx !== -1) {
        nextBag[existingIdx].quantity += addQty;
        nextBag[existingIdx].addedByAgent = true;
        if (entry.note) nextBag[existingIdx].note = entry.note;
      } else {
        nextBag.push({
          productId: product.id,
          quantity: addQty,
          addedByAgent: true,
          note: entry.note,
        });
      }
      logs.push({
        type: 'added',
        productId: product.id,
        quantity: addQty,
        deltaAmount: product.price * addQty,
        summary: `Added ${addQty}× ${product.name} (${product.unitLabel})`,
      });
    } else if (args.action === 'set_quantity' || args.action === 'replace_all') {
      const targetQty = Math.max(1, qty);
      if (existingIdx !== -1) {
        const delta = targetQty - nextBag[existingIdx].quantity;
        nextBag[existingIdx].quantity = targetQty;
        nextBag[existingIdx].addedByAgent = true;
        if (entry.note) nextBag[existingIdx].note = entry.note;
        if (delta !== 0) {
          logs.push({
            type: 'updated',
            productId: product.id,
            quantity: targetQty,
            deltaAmount: delta * product.price,
            summary: `Set ${product.name} to ${targetQty}×`,
          });
        }
      } else {
        nextBag.push({
          productId: product.id,
          quantity: targetQty,
          addedByAgent: true,
          note: entry.note,
        });
        logs.push({
          type: 'added',
          productId: product.id,
          quantity: targetQty,
          deltaAmount: product.price * targetQty,
          summary: `Added ${targetQty}× ${product.name} (${product.unitLabel})`,
        });
      }
    }
  }

  const newSubtotal = calculateBagSubtotal(nextBag);
  const detailedBag = nextBag
    .map((item) => {
      const resolved = getBagItemDetails(item);
      if (!resolved) return null;
      return {
        productId: item.productId,
        name: resolved.name,
        category: resolved.category,
        unitPrice: resolved.unitPrice,
        quantity: item.quantity,
        lineTotal: resolved.unitPrice * item.quantity,
        servesTotal: resolved.servesCount * item.quantity,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return {
    nextBag,
    logs,
    summaryResult: {
      success: true,
      warnings,
      newSubtotal,
      itemCount: nextBag.reduce((acc, i) => acc + i.quantity, 0),
      bagSummary: detailedBag,
    },
  };
}

const app = express();
app.use(express.json({ limit: '15mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/catalog', (_req, res) => {
  res.json({ catalog: CATALOG });
});

app.post('/api/agent/chat', async (req, res) => {
  try {
    const {
      message,
      history = [],
      brief,
      bag = [],
    } = req.body as {
      message: string;
      history?: Array<{ role: 'user' | 'assistant'; text: string }>;
      brief: PartyBrief;
      bag: BagItem[];
    };

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'A message string is required.' });
      return;
    }

    const ai = getAiClient();

    let workingBrief: PartyBrief = {
      occasion: brief?.occasion || 'Intimate Dinner Party',
      theme: brief?.theme || 'modern-dinner',
      guestCount: Number(brief?.guestCount) || 12,
      budgetLimit: Number(brief?.budgetLimit) || 450,
      dietaryNeeds: brief?.dietaryNeeds || 'None specified',
      specialRequests: brief?.specialRequests || '',
      venueType: brief?.venueType || 'Home Dining Room',
    };
    let workingBag: BagItem[] = Array.isArray(bag) ? bag.map((i) => ({ ...i })) : [];
    const actionsPerformed: AgentActionLog[] = [];

    const currentSubtotal = calculateBagSubtotal(workingBag);
    const currentBagReadable = workingBag
      .map((item) => {
        const p = getBagItemDetails(item);
        return p
          ? `- ${item.quantity}x ${p.name} (id: ${p.productId}, $${p.unitPrice} each, serves ${p.servesCount * item.quantity})`
          : null;
      })
      .filter(Boolean)
      .join('\n');

    const systemInstruction = `You are the CymbalMart Shopping Agent, a practical party planner designed for busy hosts.
Your goal is to convert host intent into a curated, budget-conscious CymbalMart shopping list, align items with the total budget, and refine for special requests before checkout.

Current Party Brief:
- Party Type / Occasion: ${workingBrief.occasion}
- Theme: ${workingBrief.theme}
- Guest Count: ${workingBrief.guestCount}
- Target Budget: $${workingBrief.budgetLimit}
- Dietary Needs: ${workingBrief.dietaryNeeds}
- Special Requests: ${workingBrief.specialRequests || 'None'}
- Venue: ${workingBrief.venueType}

Current CymbalMart Bag (Subtotal: $${currentSubtotal}, Budget Delta: $${workingBrief.budgetLimit - currentSubtotal}):
${currentBagReadable || '(Empty bag)'}

Guidelines:
1. Always call search_catalog before recommending or adding items so you know exact IDs, unit prices, serving yields, and dietary tags.
2. When building or aligning a plan, cover key categories (Tableware & Linens, Decor & Florals, Food & Catering, Drinks & Barware, and optional Favors & Games), scaling quantities to cover ${workingBrief.guestCount} guests while staying at or below $${workingBrief.budgetLimit}.
3. Respect dietary needs and special requests strictly (e.g., if vegan, gluten-free, nut-free, non-alcoholic, or disposable tableware for quick cleanup is requested, choose matching products).
4. After calling update_shopping_bag or update_party_brief, summarize the curated updates clearly with exact subtotal, budget status, and per-guest cost. Do not use markdown code blocks or raw JSON in your reply.`;

    const contents: Content[] = [];
    const recentHistory = history.slice(-8);
    for (const turn of recentHistory) {
      contents.push({
        role: turn.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: turn.text }],
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const tools = [
      {
        functionDeclarations: [
          searchCatalogDeclaration,
          updateShoppingBagDeclaration,
          updatePartyBriefDeclaration,
        ],
      },
    ];

    let finalReply = '';
    const maxIterations = 6;

    for (let step = 0; step < maxIterations; step++) {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction,
          tools,
        },
      });

      const modelContent = response.candidates?.[0]?.content;
      const functionCalls = response.functionCalls;

      if (!functionCalls || functionCalls.length === 0) {
        finalReply = response.text?.trim() || 'I have updated your party shopping plan.';
        break;
      }

      if (modelContent) {
        contents.push(modelContent);
      }

      const functionResponseParts = [];

      for (const call of functionCalls) {
        const callArgs = (call.args || {}) as Record<string, unknown>;
        let toolResult: unknown = { ok: true };

        if (call.name === 'search_catalog') {
          toolResult = {
            products: executeSearchCatalog({
              category: callArgs.category as ProductCategory | undefined,
              query: callArgs.query as string | undefined,
              dietaryTag: callArgs.dietaryTag as string | undefined,
              maxPrice: callArgs.maxPrice as number | undefined,
            }),
          };
        } else if (call.name === 'update_shopping_bag') {
          const outcome = executeUpdateShoppingBag(workingBag, {
            action: String(callArgs.action || 'add'),
            items: (callArgs.items as Array<{ productId: string; quantity: number; note?: string }>) || [],
          });
          workingBag = outcome.nextBag;
          actionsPerformed.push(...outcome.logs);
          toolResult = outcome.summaryResult;
        } else if (call.name === 'update_party_brief') {
          const updatedFields: string[] = [];
          if (typeof callArgs.occasion === 'string' && callArgs.occasion) {
            workingBrief.occasion = callArgs.occasion;
            updatedFields.push(callArgs.occasion);
          }
          if (typeof callArgs.theme === 'string' && callArgs.theme) {
            workingBrief.theme = callArgs.theme;
          }
          if (typeof callArgs.guestCount === 'number' && callArgs.guestCount > 0) {
            workingBrief.guestCount = Math.round(callArgs.guestCount);
            updatedFields.push(`${workingBrief.guestCount} guests`);
          }
          if (typeof callArgs.budgetLimit === 'number' && callArgs.budgetLimit > 0) {
            workingBrief.budgetLimit = Math.round(callArgs.budgetLimit);
            updatedFields.push(`$${workingBrief.budgetLimit} budget`);
          }
          if (typeof callArgs.dietaryNeeds === 'string') {
            workingBrief.dietaryNeeds = callArgs.dietaryNeeds;
            updatedFields.push(callArgs.dietaryNeeds);
          }
          if (typeof callArgs.specialRequests === 'string') {
            workingBrief.specialRequests = callArgs.specialRequests;
            if (callArgs.specialRequests) updatedFields.push('special requests');
          }
          if (typeof callArgs.venueType === 'string' && callArgs.venueType) {
            workingBrief.venueType = callArgs.venueType;
          }
          actionsPerformed.push({
            type: 'brief_updated',
            summary: `Updated party brief (${updatedFields.join(', ') || 'preferences'})`,
          });
          toolResult = { updatedBrief: workingBrief };
        }

        functionResponseParts.push({
          functionResponse: {
            id: call.id,
            name: call.name,
            response: { result: toolResult },
          },
        });
      }

      contents.push({
        role: 'user',
        parts: functionResponseParts,
      });
    }

    if (!finalReply) {
      finalReply = 'Your shopping bag has been updated to match your party plan.';
    }

    res.json({
      reply: finalReply,
      bag: workingBag,
      brief: workingBrief,
      actionsPerformed,
    });
  } catch (error) {
    console.error('Agent chat error:', error);
    const errMsg = error instanceof Error ? error.message : 'Failed to reach shopping agent.';
    res.status(500).json({ error: errMsg });
  }
});

app.post('/api/assistant/chat', async (req, res) => {
  try {
    const {
      message,
      history = [],
      brief,
      bag = [],
    } = req.body as {
      message: string;
      history?: Array<{ role: 'user' | 'assistant'; text: string }>;
      brief?: PartyBrief;
      bag?: BagItem[];
    };

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'A message string is required.' });
      return;
    }

    const ai = getAiClient();
    let workingBag: BagItem[] = Array.isArray(bag) ? bag.map((i) => ({ ...i })) : [];
    const actionsPerformed: AgentActionLog[] = [];

    const currentSubtotal = calculateBagSubtotal(workingBag);
    const currentBagReadable = workingBag
      .map((item) => {
        const p = getBagItemDetails(item);
        return p
          ? `- ${item.quantity}x ${p.name} (id: ${p.productId}, $${p.unitPrice} each)`
          : null;
      })
      .filter(Boolean)
      .join('\n');

    const systemInstruction = `You are CymbalMart Assistant, the friendly customer-facing concierge chatbot on CymbalMart.
Help customers with questions about CymbalMart party products, serving sizes, dietary/allergen tags, hosting pairings, delivery & store pickup policies, and adding specific items to their bag.

CymbalMart Store Policies:
- Courier Delivery: $18 flat fee, or FREE on orders $250 and above. Scheduled to arrive 2 days before the customer's event date.
- Store Pickup: Always FREE at the CymbalMart Flagship Pickup Desk; ready 24 hours prior to the event date.
- Tax: Estimated 8.25% sales tax calculated at checkout.
- Guarantee: Freshness & breakage protection on all catering boards, botanicals, and glassware.

Customer Context:
- Current Event: ${brief?.occasion || 'Gathering'} for ${brief?.guestCount || 12} guests (Target Budget: $${brief?.budgetLimit || 450})
- Dietary Focus: ${brief?.dietaryNeeds || 'None specified'}
- Special Requests: ${brief?.specialRequests || 'None'}
- Current Bag Subtotal: $${currentSubtotal}
${currentBagReadable || '(Bag is currently empty)'}

Guidelines:
1. Call search_catalog whenever a customer asks about products, prices, ingredients, serving yields, or dietary options (vegan, gluten-free, nut-free, non-alcoholic).
2. Only call update_shopping_bag if the customer explicitly asks to add, remove, or change an item in their bag.
3. Keep replies warm, clear, helpful, and concise (2–4 sentences unless listing specific matching products). Never output raw JSON or markdown code blocks.`;

    const contents: Content[] = [];
    for (const turn of history.slice(-8)) {
      contents.push({
        role: turn.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: turn.text }],
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const tools = [
      {
        functionDeclarations: [searchCatalogDeclaration, updateShoppingBagDeclaration],
      },
    ];

    let finalReply = '';
    for (let step = 0; step < 4; step++) {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction,
          tools,
        },
      });

      const modelContent = response.candidates?.[0]?.content;
      const functionCalls = response.functionCalls;

      if (!functionCalls || functionCalls.length === 0) {
        finalReply =
          response.text?.trim() ||
          'How else can I assist you with your CymbalMart order today?';
        break;
      }

      if (modelContent) {
        contents.push(modelContent);
      }

      const functionResponseParts = [];
      for (const call of functionCalls) {
        const callArgs = (call.args || {}) as Record<string, unknown>;
        let toolResult: unknown = { ok: true };

        if (call.name === 'search_catalog') {
          toolResult = {
            products: executeSearchCatalog({
              category: callArgs.category as ProductCategory | undefined,
              query: callArgs.query as string | undefined,
              dietaryTag: callArgs.dietaryTag as string | undefined,
              maxPrice: callArgs.maxPrice as number | undefined,
            }),
          };
        } else if (call.name === 'update_shopping_bag') {
          const outcome = executeUpdateShoppingBag(workingBag, {
            action: String(callArgs.action || 'add'),
            items:
              (callArgs.items as Array<{
                productId: string;
                quantity: number;
                note?: string;
              }>) || [],
          });
          workingBag = outcome.nextBag;
          actionsPerformed.push(...outcome.logs);
          toolResult = outcome.summaryResult;
        }

        functionResponseParts.push({
          functionResponse: {
            id: call.id,
            name: call.name,
            response: { result: toolResult },
          },
        });
      }

      contents.push({
        role: 'user',
        parts: functionResponseParts,
      });
    }

    if (!finalReply) {
      finalReply = 'I have updated your bag—let me know if you need anything else!';
    }

    res.json({
      reply: finalReply,
      bag: workingBag,
      actionsPerformed,
    });
  } catch (error) {
    console.error('CymbalMart Assistant error:', error);
    const errMsg =
      error instanceof Error ? error.message : 'Unable to reach CymbalMart Assistant.';
    res.status(500).json({ error: errMsg });
  }
});

const addCustomItemDeclaration: FunctionDeclaration = {
  name: 'add_custom_item',
  description:
    'Add a custom non-catalog item requested by the customer to the shopping list with a name, category, unit price, and quantity.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      category: {
        type: Type.STRING,
        description:
          'One of: "Tableware & Linens", "Decor & Florals", "Food & Catering", "Drinks & Barware", "Favors & Games".',
      },
      unitPrice: { type: Type.NUMBER },
      quantity: { type: Type.NUMBER },
    },
    required: ['name', 'unitPrice', 'quantity'],
  },
};

const setFulfillmentMethodDeclaration: FunctionDeclaration = {
  name: 'set_fulfillment_method',
  description:
    'Switch fulfillment between courier "delivery" ($18, free at $250+) and free CymbalMart store "pickup".',
  parameters: {
    type: Type.OBJECT,
    properties: {
      method: {
        type: Type.STRING,
        description: '"delivery" or "pickup"',
      },
    },
    required: ['method'],
  },
};

const setCheckoutDetailsDeclaration: FunctionDeclaration = {
  name: 'set_checkout_details',
  description:
    'Record customer checkout fields (host name, email, delivery address, event date) and optionally open the checkout drawer.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      customerName: { type: Type.STRING },
      customerEmail: { type: Type.STRING },
      deliveryAddress: { type: Type.STRING },
      eventDate: {
        type: Type.STRING,
        description: 'ISO date YYYY-MM-DD',
      },
      openDrawer: { type: Type.BOOLEAN },
    },
  },
};

const submitOrderDeclaration: FunctionDeclaration = {
  name: 'submit_order',
  description:
    'Finalize and place the customer CymbalMart order once bag is non-empty and required checkout details (name, email, eventDate, and deliveryAddress if delivery) are present.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      confirm: { type: Type.BOOLEAN },
    },
    required: ['confirm'],
  },
};

const triggerClientActionDeclaration: FunctionDeclaration = {
  name: 'trigger_client_action',
  description:
    'Navigate or trigger UI actions hands-free for the customer.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        description:
          'One of: "open_bag", "close_bag", "switch_tab_plan", "switch_tab_catalog", "save_plan", "scroll_brief", "scroll_workspace", "scroll_portion_guide".',
      },
    },
    required: ['action'],
  },
};

app.post('/api/voice/turn', async (req, res) => {
  try {
    const {
      audioBase64,
      audioMimeType = 'audio/webm',
      transcriptText,
      history = [],
      brief,
      bag = [],
      fulfillmentMethod = 'delivery',
      checkoutDetails,
    } = req.body as {
      audioBase64?: string;
      audioMimeType?: string;
      transcriptText?: string;
      history?: Array<{ role: 'user' | 'assistant'; text: string }>;
      brief?: PartyBrief;
      bag?: BagItem[];
      fulfillmentMethod?: 'delivery' | 'pickup';
      checkoutDetails?: CheckoutDetails;
    };

    const ai = getAiClient();

    let spokenTranscript = (transcriptText || '').trim();
    if (audioBase64) {
      const cleanMime = audioMimeType.split(';')[0] || 'audio/webm';
      const transcribeResp = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: cleanMime,
                data: audioBase64,
              },
            },
            {
              text: 'Transcribe the customer spoken command verbatim in English. Return only the spoken transcript with no commentary. If there is only silence or background noise, return an empty string.',
            },
          ],
        },
      });
      spokenTranscript = (transcribeResp.text || '').trim();
    }

    if (!spokenTranscript) {
      res.json({
        transcript: '',
        reply: '',
        audioBase64: null,
        bag,
        brief,
        fulfillmentMethod,
        checkoutDetails,
        orderConfirmation: null,
        clientActions: [],
        actionsPerformed: [],
      });
      return;
    }

    let workingBrief: PartyBrief = {
      occasion: brief?.occasion || 'Intimate Dinner Party',
      theme: brief?.theme || 'modern-dinner',
      guestCount: Number(brief?.guestCount) || 12,
      budgetLimit: Number(brief?.budgetLimit) || 450,
      dietaryNeeds: brief?.dietaryNeeds || 'None specified',
      specialRequests: brief?.specialRequests || '',
      venueType: brief?.venueType || 'Home Dining Room',
    };
    let workingBag: BagItem[] = Array.isArray(bag) ? bag.map((i) => ({ ...i })) : [];
    let workingFulfillment: 'delivery' | 'pickup' =
      fulfillmentMethod === 'pickup' ? 'pickup' : 'delivery';
    let workingCheckout: CheckoutDetails = {
      customerName: checkoutDetails?.customerName || '',
      customerEmail: checkoutDetails?.customerEmail || '',
      deliveryAddress: checkoutDetails?.deliveryAddress || '',
      eventDate: checkoutDetails?.eventDate || '2026-12-12',
    };
    let orderConfirmation: OrderConfirmation | null = null;
    const clientActions: VoiceClientAction[] = [];
    const actionsPerformed: AgentActionLog[] = [];

    const currentSubtotal = calculateBagSubtotal(workingBag);
    const currentBagReadable = workingBag
      .map((item) => {
        const p = getBagItemDetails(item);
        return p
          ? `- ${item.quantity}x ${p.name} (id: ${p.productId}, $${p.unitPrice} each)`
          : null;
      })
      .filter(Boolean)
      .join('\n');

    const systemInstruction = `You are the CymbalMart Hands-Free Voice Shopping Agent.
Customers use voice to complete the ENTIRE party planning and checkout journey without touching the screen:
1. Define Event (party type, theme, guest count, budget, dietary focus, special requests)
2. Review List & Budget Alignment (search catalog, add/update/remove items, add custom items, align with budget)
3. Refine & Checkout (switch delivery vs. free pickup, capture host name, email, delivery address if delivery, event date, open checkout, save plan, and place the final order)

Current State:
- Brief: ${workingBrief.occasion}, theme=${workingBrief.theme}, ${workingBrief.guestCount} guests, budget=$${workingBrief.budgetLimit}, dietary="${workingBrief.dietaryNeeds}", special="${workingBrief.specialRequests || 'None'}"
- Bag Subtotal: $${currentSubtotal} (${workingBag.length} items)
${currentBagReadable || '(Bag is empty)'}
- Fulfillment: ${workingFulfillment}
- Checkout Info: name="${workingCheckout.customerName}", email="${workingCheckout.customerEmail}", address="${workingCheckout.deliveryAddress}", eventDate="${workingCheckout.eventDate}"

Rules:
- Execute tools immediately for whatever the customer asks.
- When the customer asks to place/submit/confirm the order, check if name, email, and (for delivery) delivery address are filled. If anything is missing, ask politely for the missing fields by voice and open the checkout drawer using set_checkout_details(openDrawer: true). If all required fields are present, call submit_order(confirm: true).
- Keep your spoken response natural, warm, and concise (1 to 3 short sentences, plain text without bullet symbols or markdown) so it sounds great read aloud.`;

    const contents: Content[] = [];
    for (const turn of history.slice(-6)) {
      contents.push({
        role: turn.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: turn.text }],
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: spokenTranscript }],
    });

    const tools = [
      {
        functionDeclarations: [
          searchCatalogDeclaration,
          updatePartyBriefDeclaration,
          updateShoppingBagDeclaration,
          addCustomItemDeclaration,
          setFulfillmentMethodDeclaration,
          setCheckoutDetailsDeclaration,
          submitOrderDeclaration,
          triggerClientActionDeclaration,
        ],
      },
    ];

    let finalReply = '';
    for (let step = 0; step < 6; step++) {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction,
          tools,
        },
      });

      const modelContent = response.candidates?.[0]?.content;
      const functionCalls = response.functionCalls;

      if (!functionCalls || functionCalls.length === 0) {
        finalReply =
          response.text?.trim() || 'Done. What would you like to do next?';
        break;
      }

      if (modelContent) {
        contents.push(modelContent);
      }

      const functionResponseParts = [];
      for (const call of functionCalls) {
        const callArgs = (call.args || {}) as Record<string, unknown>;
        let toolResult: unknown = { ok: true };

        if (call.name === 'search_catalog') {
          toolResult = {
            products: executeSearchCatalog({
              category: callArgs.category as ProductCategory | undefined,
              query: callArgs.query as string | undefined,
              dietaryTag: callArgs.dietaryTag as string | undefined,
              maxPrice: callArgs.maxPrice as number | undefined,
            }),
          };
        } else if (call.name === 'update_party_brief') {
          if (typeof callArgs.occasion === 'string' && callArgs.occasion) {
            workingBrief.occasion = callArgs.occasion;
          }
          if (typeof callArgs.theme === 'string' && callArgs.theme) {
            workingBrief.theme = callArgs.theme;
          }
          if (typeof callArgs.guestCount === 'number' && callArgs.guestCount > 0) {
            workingBrief.guestCount = Math.round(callArgs.guestCount);
          }
          if (typeof callArgs.budgetLimit === 'number' && callArgs.budgetLimit > 0) {
            workingBrief.budgetLimit = Math.round(callArgs.budgetLimit);
          }
          if (typeof callArgs.dietaryNeeds === 'string') {
            workingBrief.dietaryNeeds = callArgs.dietaryNeeds;
          }
          if (typeof callArgs.specialRequests === 'string') {
            workingBrief.specialRequests = callArgs.specialRequests;
          }
          actionsPerformed.push({
            type: 'brief_updated',
            summary: `Updated brief (${workingBrief.occasion}, ${workingBrief.guestCount} guests, $${workingBrief.budgetLimit})`,
          });
          toolResult = { updatedBrief: workingBrief };
        } else if (call.name === 'update_shopping_bag') {
          const outcome = executeUpdateShoppingBag(workingBag, {
            action: String(callArgs.action || 'add'),
            items:
              (callArgs.items as Array<{
                productId: string;
                quantity: number;
                note?: string;
              }>) || [],
          });
          workingBag = outcome.nextBag;
          actionsPerformed.push(...outcome.logs);
          toolResult = outcome.summaryResult;
        } else if (call.name === 'add_custom_item') {
          const itemName = String(callArgs.name || 'Custom Item').trim();
          const unitPrice = Math.max(0, Number(callArgs.unitPrice) || 0);
          const qty = Math.max(1, Math.round(Number(callArgs.quantity) || 1));
          const validCategories: ProductCategory[] = [
            'Tableware & Linens',
            'Decor & Florals',
            'Food & Catering',
            'Drinks & Barware',
            'Favors & Games',
          ];
          const rawCat = String(callArgs.category || 'Food & Catering');
          const category = validCategories.includes(rawCat as ProductCategory)
            ? (rawCat as ProductCategory)
            : 'Food & Catering';
          const id = `custom-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          workingBag.push({
            productId: id,
            quantity: qty,
            addedByAgent: true,
            customItem: {
              name: itemName,
              category,
              unitPrice,
              unitLabel: 'Custom item',
              servesCount: workingBrief.guestCount,
            },
          });
          actionsPerformed.push({
            type: 'added',
            productId: id,
            quantity: qty,
            deltaAmount: unitPrice * qty,
            summary: `Added ${qty}× ${itemName} (custom)`,
          });
          toolResult = {
            added: itemName,
            newSubtotal: calculateBagSubtotal(workingBag),
          };
        } else if (call.name === 'set_fulfillment_method') {
          workingFulfillment =
            callArgs.method === 'pickup' ? 'pickup' : 'delivery';
          actionsPerformed.push({
            type: 'brief_updated',
            summary: `Switched fulfillment to ${workingFulfillment === 'pickup' ? 'Free Store Pickup' : 'Courier Delivery'}`,
          });
          toolResult = { fulfillmentMethod: workingFulfillment };
        } else if (call.name === 'set_checkout_details') {
          if (typeof callArgs.customerName === 'string') {
            workingCheckout.customerName = callArgs.customerName.trim();
          }
          if (typeof callArgs.customerEmail === 'string') {
            workingCheckout.customerEmail = callArgs.customerEmail.trim();
          }
          if (typeof callArgs.deliveryAddress === 'string') {
            workingCheckout.deliveryAddress = callArgs.deliveryAddress.trim();
          }
          if (typeof callArgs.eventDate === 'string' && callArgs.eventDate.trim()) {
            workingCheckout.eventDate = callArgs.eventDate.trim();
          }
          if (callArgs.openDrawer) {
            clientActions.push('open_bag');
          }
          actionsPerformed.push({
            type: 'brief_updated',
            summary: 'Updated checkout details',
          });
          toolResult = { checkoutDetails: workingCheckout };
        } else if (call.name === 'submit_order') {
          if (workingBag.length === 0) {
            toolResult = { error: 'Your shopping bag is empty.' };
          } else if (
            !workingCheckout.customerName.trim() ||
            !workingCheckout.customerEmail.trim() ||
            (workingFulfillment === 'delivery' &&
              !workingCheckout.deliveryAddress.trim())
          ) {
            clientActions.push('open_bag');
            toolResult = {
              error:
                'Missing required checkout fields. Ask the customer for their name, email, and delivery address (or suggest switching to store pickup).',
            };
          } else {
            const lineItems = workingBag
              .map((item) => {
                const p = getBagItemDetails(item);
                if (!p || item.quantity <= 0) return null;
                return {
                  productId: p.productId,
                  name: p.name,
                  unitLabel: p.unitLabel,
                  quantity: item.quantity,
                  unitPrice: p.unitPrice,
                  lineTotal: p.unitPrice * item.quantity,
                };
              })
              .filter((x): x is NonNullable<typeof x> => x !== null);

            const subtotal = lineItems.reduce((sum, l) => sum + l.lineTotal, 0);
            const deliveryFee =
              workingFulfillment === 'pickup'
                ? 0
                : subtotal >= 250
                  ? 0
                  : 18;
            const tax = Math.round(subtotal * 0.0825 * 100) / 100;
            const total = Math.round((subtotal + deliveryFee + tax) * 100) / 100;
            const randomSuffix = Math.floor(1000 + Math.random() * 9000);
            const orderNumber = `CM-${new Date().getFullYear()}-${randomSuffix}`;

            orderConfirmation = {
              orderNumber,
              customerName: workingCheckout.customerName.trim(),
              customerEmail: workingCheckout.customerEmail.trim(),
              deliveryAddress:
                workingFulfillment === 'pickup'
                  ? 'CymbalMart Flagship Pickup Desk · Ready 24h Prior'
                  : workingCheckout.deliveryAddress.trim(),
              fulfillmentMethod: workingFulfillment,
              eventDate: workingCheckout.eventDate || '2026-12-12',
              estimatedDelivery:
                workingFulfillment === 'pickup'
                  ? 'Curbside & Desk Pickup ready 1 day before event'
                  : 'Courier delivery 2 days before your event date',
              items: lineItems,
              subtotal,
              deliveryFee,
              tax,
              total,
            };
            workingBag = [];
            clientActions.push('open_bag');
            actionsPerformed.push({
              type: 'cleared',
              summary: `Confirmed Order #${orderNumber} ($${total.toFixed(2)})`,
            });
            toolResult = { orderConfirmation };
          }
        } else if (call.name === 'trigger_client_action') {
          const act = String(callArgs.action || '') as VoiceClientAction;
          if (act) clientActions.push(act);
          toolResult = { triggered: act };
        }

        functionResponseParts.push({
          functionResponse: {
            id: call.id,
            name: call.name,
            response: { result: toolResult },
          },
        });
      }

      contents.push({
        role: 'user',
        parts: functionResponseParts,
      });
    }

    if (!finalReply) {
      finalReply = 'Your CymbalMart plan has been updated.';
    }

    let replyAudioBase64: string | null = null;
    try {
      const ttsResp = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: finalReply,
                speechMetadata: {
                  style: 'Warm, clear, efficient shopping concierge',
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });
      replyAudioBase64 =
        ttsResp.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (ttsError) {
      console.warn('TTS synthesis skipped due to upstream error:', ttsError);
    }

    res.json({
      transcript: spokenTranscript,
      reply: finalReply,
      audioBase64: replyAudioBase64,
      audioMimeType: 'audio/wav',
      bag: workingBag,
      brief: workingBrief,
      fulfillmentMethod: workingFulfillment,
      checkoutDetails: workingCheckout,
      orderConfirmation,
      clientActions,
      actionsPerformed,
    });
  } catch (error) {
    console.error('Voice turn error:', error);
    const errMsg =
      error instanceof Error ? error.message : 'Unable to process voice command.';
    res.status(500).json({ error: errMsg });
  }
});

app.post('/api/orders', (req, res) => {
  const {
    customerName,
    customerEmail,
    deliveryAddress,
    fulfillmentMethod = 'delivery',
    eventDate,
    bag,
  } = req.body as {
    customerName?: string;
    customerEmail?: string;
    deliveryAddress?: string;
    fulfillmentMethod?: 'delivery' | 'pickup';
    eventDate?: string;
    bag?: BagItem[];
  };

  if (
    !customerName?.trim() ||
    !customerEmail?.trim() ||
    (fulfillmentMethod === 'delivery' && !deliveryAddress?.trim()) ||
    !eventDate?.trim()
  ) {
    res.status(400).json({ error: 'Please complete all required checkout fields.' });
    return;
  }
  if (!Array.isArray(bag) || bag.length === 0) {
    res.status(400).json({ error: 'Your shopping bag is empty.' });
    return;
  }

  const lineItems = bag
    .map((item) => {
      const p = getBagItemDetails(item);
      if (!p || item.quantity <= 0) return null;
      return {
        productId: p.productId,
        name: p.name,
        unitLabel: p.unitLabel,
        quantity: item.quantity,
        unitPrice: p.unitPrice,
        lineTotal: p.unitPrice * item.quantity,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (lineItems.length === 0) {
    res.status(400).json({ error: 'No valid products found in bag.' });
    return;
  }

  const subtotal = lineItems.reduce((sum, l) => sum + l.lineTotal, 0);
  const deliveryFee =
    fulfillmentMethod === 'pickup' ? 0 : subtotal >= 250 ? 0 : 18;
  const tax = Math.round(subtotal * 0.0825 * 100) / 100;
  const total = Math.round((subtotal + deliveryFee + tax) * 100) / 100;

  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const orderNumber = `CM-${new Date().getFullYear()}-${randomSuffix}`;

  res.json({
    orderNumber,
    customerName: customerName.trim(),
    customerEmail: customerEmail.trim(),
    deliveryAddress:
      fulfillmentMethod === 'pickup'
        ? 'CymbalMart Flagship Pickup Desk · Ready 24h Prior'
        : deliveryAddress!.trim(),
    fulfillmentMethod,
    eventDate: eventDate.trim(),
    estimatedDelivery:
      fulfillmentMethod === 'pickup'
        ? 'Curbside & Desk Pickup ready 1 day before event'
        : 'Courier delivery 2 days before your event date',
    items: lineItems,
    subtotal,
    deliveryFee,
    tax,
    total,
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CymbalMart Shopping Agent server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
