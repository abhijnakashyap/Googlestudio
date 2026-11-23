import { useState } from 'react';
import {
  calculateBagSubtotal,
  getBagItemDetails,
  type BagItem,
  type ChatMessage,
  type CheckoutDetails,
  type CustomBagItemDetails,
  type OrderConfirmation,
  type PartyBrief,
  type VoiceClientAction,
} from './shared/catalog';
import { Header } from './components/Header';
import { HeroBrief } from './components/HeroBrief';
import { AgentWorkspace } from './components/AgentWorkspace';
import { PortionCalculator } from './components/PortionCalculator';
import { BagDrawer } from './components/BagDrawer';
import { CymbalMartAssistant } from './components/CymbalMartAssistant';
import { VoiceController } from './components/VoiceController';

const INITIAL_BRIEF: PartyBrief = {
  occasion: 'Intimate Dinner Party',
  theme: 'modern-dinner',
  guestCount: 12,
  budgetLimit: 450,
  dietaryNeeds: 'None specified',
  specialRequests: 'Include ambient candlelight and zero-proof toast options',
  venueType: 'Home Dining Room',
};

const INITIAL_BAG: BagItem[] = [
  {
    productId: 'tw-linen-napkins',
    quantity: 2,
    addedByAgent: true,
    note: '12 Belgian linen napkins for seated dinner',
  },
  {
    productId: 'tw-fluted-coupes',
    quantity: 2,
    addedByAgent: true,
    note: '12 crystal coupes for welcome aperitifs',
  },
  {
    productId: 'df-botanical-centerpiece',
    quantity: 1,
    addedByAgent: true,
    note: 'Anchor floral arrangement for dining table',
  },
  {
    productId: 'df-brass-tapers',
    quantity: 1,
    addedByAgent: true,
    note: '4 brass candlesticks + dripless beeswax tapers',
  },
  {
    productId: 'fc-charcuterie-kit',
    quantity: 1,
    addedByAgent: true,
    note: 'Artisanal grazing board for opening hour',
  },
  {
    productId: 'fc-focaccia-oil',
    quantity: 2,
    addedByAgent: true,
    note: 'Warm rosemary sourdough focaccia for 12+ guests',
  },
  {
    productId: 'db-botanical-aperitif',
    quantity: 2,
    addedByAgent: true,
    note: '4 chilled bottles for non-alcoholic & spritz toasts',
  },
];

function formatTime(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome-1',
    role: 'assistant',
    text: 'Welcome to CymbalMart Shopping Agent. I have prepared a starter Modern Candlelit dinner list for 12 guests at $434 — aligned within your $450 budget ($36.17 per guest) and covering ambient candlelight plus zero-proof toast options.\n\nUpdate quantities or add items directly on the left to recalculate budget totals instantly, or ask me to refine constraints.',
    timestamp: formatTime(),
  },
];

export default function App() {
  const [brief, setBrief] = useState<PartyBrief>(INITIAL_BRIEF);
  const [bag, setBag] = useState<BagItem[]>(INITIAL_BAG);
  const [fulfillmentMethod, setFulfillmentMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [checkoutDetails, setCheckoutDetails] = useState<CheckoutDetails>({
    customerName: '',
    customerEmail: '',
    deliveryAddress: '',
    eventDate: '2026-12-12',
  });
  const [orderConfirmation, setOrderConfirmation] = useState<OrderConfirmation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'plan' | 'catalog'>('plan');
  const [isBagOpen, setIsBagOpen] = useState(false);

  const subtotal = calculateBagSubtotal(bag);
  const totalItemCount = bag.reduce((sum, item) => sum + item.quantity, 0);

  const handleUpdateQty = (productId: string, qty: number) => {
    setBag((prev) => {
      if (qty <= 0) {
        return prev.filter((item) => item.productId !== productId);
      }
      const exists = prev.some((item) => item.productId === productId);
      if (!exists) {
        return [...prev, { productId, quantity: qty }];
      }
      return prev.map((item) =>
        item.productId === productId ? { ...item, quantity: qty } : item
      );
    });
  };

  const handleUpdateCustomPrice = (productId: string, unitPrice: number) => {
    setBag((prev) =>
      prev.map((item) =>
        item.productId === productId && item.customItem
          ? {
              ...item,
              customItem: {
                ...item.customItem,
                unitPrice: Math.max(0, unitPrice),
              },
            }
          : item
      )
    );
  };

  const handleAddProduct = (productId: string, qty = 1) => {
    const addQty = Math.max(1, qty);
    setBag((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (existing) {
        return prev.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + addQty }
            : item
        );
      }
      return [...prev, { productId, quantity: addQty }];
    });
  };

  const handleAddCustomItem = (custom: CustomBagItemDetails, qty: number) => {
    const id = `custom-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setBag((prev) => [
      ...prev,
      {
        productId: id,
        quantity: Math.max(1, qty),
        customItem: custom,
      },
    ]);
  };

  const handleClearBag = () => {
    setBag([]);
  };

  const handleSendMessage = async (promptText: string) => {
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: promptText,
      timestamp: formatTime(),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setAgentError(null);
    setIsAgentThinking(true);

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: promptText,
          history: messages.map((m) => ({ role: m.role, text: m.text })),
          brief,
          bag,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Agent request failed.');
      }

      if (Array.isArray(data.bag)) {
        setBag(data.bag);
      }
      if (data.brief) {
        setBrief(data.brief);
      }

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: data.reply,
        actions: Array.isArray(data.actionsPerformed) ? data.actionsPerformed : [],
        timestamp: formatTime(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setAgentError(
        err instanceof Error
          ? err.message
          : 'Unable to reach CymbalMart Shopping Agent right now.'
      );
    } finally {
      setIsAgentThinking(false);
    }
  };

  const handleBuildPlanFromBrief = () => {
    setActiveTab('plan');
    const workspaceEl = document.getElementById('workspace');
    workspaceEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const specialClause = brief.specialRequests.trim()
      ? ` and special requests: "${brief.specialRequests.trim()}"`
      : '';
    handleSendMessage(
      `Curate a fresh complete CymbalMart shopping list (replace_all in my bag) for a ${brief.occasion} (${brief.theme} theme) with ${brief.guestCount} guests, total budget $${brief.budgetLimit}, dietary preference "${brief.dietaryNeeds}"${specialClause}. Align all quantities to stay within budget.`
    );
  };

  const handleAlignToBudget = () => {
    setActiveTab('plan');
    handleSendMessage(
      `Review my current CymbalMart shopping bag (subtotal $${subtotal}) and adjust or swap items so the total aligns at or below my $${brief.budgetLimit} budget while keeping coverage for ${brief.guestCount} guests and respecting "${brief.dietaryNeeds}".`
    );
  };

  const handleExportPlan = () => {
    const lines: string[] = [
      'CYMBALMART SHOPPING AGENT — PARTY PLAN',
      '========================================',
      `Party Type: ${brief.occasion}`,
      `Theme: ${brief.theme}`,
      `Guest Count: ${brief.guestCount}`,
      `Budget Target: $${brief.budgetLimit}`,
      `Dietary Focus: ${brief.dietaryNeeds}`,
      `Special Requests: ${brief.specialRequests || 'None'}`,
      '',
      'CURATED SHOPPING LIST',
      '---------------------',
    ];

    bag.forEach((item) => {
      const p = getBagItemDetails(item);
      if (!p) return;
      lines.push(
        `[ ] ${item.quantity}x ${p.name} (${p.unitLabel}) — $${p.unitPrice * item.quantity} ($${p.unitPrice}/ea)`
      );
    });

    const deliveryFee =
      fulfillmentMethod === 'pickup' ? 0 : subtotal >= 250 ? 0 : 18;
    const tax = Math.round(subtotal * 0.0825 * 100) / 100;

    lines.push('');
    lines.push(`Subtotal: $${subtotal.toFixed(2)}`);
    lines.push(
      `Fulfillment (${fulfillmentMethod}): ${deliveryFee === 0 ? 'Free' : `$${deliveryFee.toFixed(2)}`}`
    );
    lines.push(`Estimated Tax (8.25%): $${tax.toFixed(2)}`);
    lines.push(`Estimated Total: $${(subtotal + deliveryFee + tax).toFixed(2)}`);
    lines.push(
      `Spend per Guest: $${(subtotal / Math.max(1, brief.guestCount)).toFixed(2)}`
    );

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'CymbalMart Shopping Agent.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSyncEssentialsFromCalculator = (
    durationHours: number,
    includeBuffer: boolean
  ) => {
    const guests = brief.guestCount;
    const glasswareTarget = includeBuffer ? Math.ceil(guests * 1.15) : guests;
    const coupePacks = Math.max(1, Math.ceil(glasswareTarget / 6));
    const napkinPacks = Math.max(
      1,
      Math.ceil((guests * (durationHours >= 4 ? 2 : 1)) / 6)
    );
    const candlePacks = Math.max(1, Math.ceil(guests / 10));

    setBag((prev) => {
      const map = new Map(prev.map((i) => [i.productId, { ...i }]));
      map.set('tw-fluted-coupes', {
        productId: 'tw-fluted-coupes',
        quantity: coupePacks,
        note: `Synced for ${glasswareTarget} glasses (${durationHours}h event)`,
      });
      map.set('tw-linen-napkins', {
        productId: 'tw-linen-napkins',
        quantity: napkinPacks,
        note: `Synced for ${napkinPacks * 6} linen napkins`,
      });
      map.set('df-brass-tapers', {
        productId: 'df-brass-tapers',
        quantity: candlePacks,
        note: `Synced candlelight for ${guests} guests`,
      });
      return Array.from(map.values());
    });
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        text: `Started a fresh CymbalMart planning thread for your ${brief.occasion} (${brief.guestCount} guests, $${brief.budgetLimit} budget). What constraints or items would you like to refine?`,
        timestamp: formatTime(),
      },
    ]);
    setAgentError(null);
  };

  const handleSyncFromVoice = (payload: {
    bag?: BagItem[];
    brief?: PartyBrief;
    fulfillmentMethod?: 'delivery' | 'pickup';
    checkoutDetails?: CheckoutDetails;
    orderConfirmation?: OrderConfirmation | null;
    clientActions?: VoiceClientAction[];
  }) => {
    if (Array.isArray(payload.bag)) {
      setBag(payload.bag);
    }
    if (payload.brief) {
      setBrief(payload.brief);
    }
    if (payload.fulfillmentMethod) {
      setFulfillmentMethod(payload.fulfillmentMethod);
    }
    if (payload.checkoutDetails) {
      setCheckoutDetails(payload.checkoutDetails);
    }
    if (payload.orderConfirmation) {
      setOrderConfirmation(payload.orderConfirmation);
    }
    for (const act of payload.clientActions || []) {
      if (act === 'open_bag') setIsBagOpen(true);
      else if (act === 'close_bag') setIsBagOpen(false);
      else if (act === 'switch_tab_plan') setActiveTab('plan');
      else if (act === 'switch_tab_catalog') setActiveTab('catalog');
      else if (act === 'save_plan') handleExportPlan();
      else if (act === 'scroll_brief') {
        document.getElementById('brief')?.scrollIntoView({ behavior: 'smooth' });
      } else if (act === 'scroll_workspace') {
        document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' });
      } else if (act === 'scroll_portion_guide') {
        document.getElementById('portion-guide')?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#F8F8F6] text-[#141413]">
      <Header
        itemCount={totalItemCount}
        subtotal={subtotal}
        onOpenBag={() => setIsBagOpen(true)}
      />

      <main className="flex-1">
        <HeroBrief
          brief={brief}
          onChangeBrief={setBrief}
          onBuildPlan={handleBuildPlanFromBrief}
          isBuilding={isAgentThinking}
        />

        <AgentWorkspace
          brief={brief}
          bag={bag}
          fulfillmentMethod={fulfillmentMethod}
          onChangeFulfillment={setFulfillmentMethod}
          onChangeBudgetLimit={(budgetLimit) =>
            setBrief((prev) => ({ ...prev, budgetLimit }))
          }
          messages={messages}
          isAgentThinking={isAgentThinking}
          agentError={agentError}
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          onUpdateQty={handleUpdateQty}
          onUpdateCustomPrice={handleUpdateCustomPrice}
          onAddProduct={handleAddProduct}
          onAddCustomItem={handleAddCustomItem}
          onClearBag={handleClearBag}
          onSendMessage={handleSendMessage}
          onAlignToBudget={handleAlignToBudget}
          onExportPlan={handleExportPlan}
          onOpenCheckout={() => setIsBagOpen(true)}
          onResetChat={handleResetChat}
        />

        <PortionCalculator
          brief={brief}
          onSyncEssentials={handleSyncEssentialsFromCalculator}
        />
      </main>

      <footer className="border-t border-[#E5E5E0] bg-[#F8F8F6]">
        <div className="max-w-[1360px] mx-auto px-6 lg:px-10 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#5C5C57]">
          <div className="flex items-center gap-3">
            <span
              className="text-sm font-medium text-[#141413]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              CymbalMart Shopping Agent
            </span>
            <span aria-hidden="true">·</span>
            <span>Party Planning &amp; Budget-Aligned Fulfillment</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#brief" className="hover:text-[#141413] transition-colors">
              Define Event
            </a>
            <a href="#workspace" className="hover:text-[#141413] transition-colors">
              Review List
            </a>
            <a href="#portion-guide" className="hover:text-[#141413] transition-colors">
              Portion Guide
            </a>
            <button
              type="button"
              onClick={() => setIsBagOpen(true)}
              className="hover:text-[#141413] transition-colors cursor-pointer"
            >
              Checkout
            </button>
          </div>
        </div>
      </footer>

      <BagDrawer
        isOpen={isBagOpen}
        onClose={() => setIsBagOpen(false)}
        bag={bag}
        fulfillmentMethod={fulfillmentMethod}
        onChangeFulfillment={setFulfillmentMethod}
        checkoutDetails={checkoutDetails}
        onChangeCheckoutDetails={setCheckoutDetails}
        confirmation={orderConfirmation}
        onSetConfirmation={setOrderConfirmation}
        onUpdateQty={handleUpdateQty}
        onClearBag={handleClearBag}
        onExportPlan={handleExportPlan}
      />

      <VoiceController
        brief={brief}
        bag={bag}
        fulfillmentMethod={fulfillmentMethod}
        checkoutDetails={checkoutDetails}
        onSyncFromVoice={handleSyncFromVoice}
      />

      <CymbalMartAssistant
        brief={brief}
        bag={bag}
        onBagUpdate={setBag}
      />
    </div>
  );
}
