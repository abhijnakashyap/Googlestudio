export type ProductCategory =
  | 'Tableware & Linens'
  | 'Decor & Florals'
  | 'Food & Catering'
  | 'Drinks & Barware'
  | 'Favors & Games';

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'Tableware & Linens',
  'Decor & Florals',
  'Food & Catering',
  'Drinks & Barware',
  'Favors & Games',
];

export type DietaryTag = 'vegan' | 'gluten-free' | 'nut-free' | 'non-alcoholic';

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  price: number;
  unitLabel: string;
  servesCount: number;
  description: string;
  imageUrl: string;
  dietaryTags: DietaryTag[];
  themes: string[];
  inStock: boolean;
}

export interface CustomBagItemDetails {
  name: string;
  category: ProductCategory;
  unitPrice: number;
  unitLabel: string;
  servesCount: number;
}

export interface BagItem {
  productId: string;
  quantity: number;
  addedByAgent?: boolean;
  note?: string;
  customItem?: CustomBagItemDetails;
}

export interface PartyBrief {
  occasion: string;
  theme: string;
  guestCount: number;
  budgetLimit: number;
  dietaryNeeds: string;
  specialRequests: string;
  venueType: string;
}

export interface AgentActionLog {
  type: 'added' | 'updated' | 'removed' | 'cleared' | 'brief_updated';
  summary: string;
  productId?: string;
  quantity?: number;
  deltaAmount?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  actions?: AgentActionLog[];
  timestamp: string;
}

export interface CheckoutDetails {
  customerName: string;
  customerEmail: string;
  deliveryAddress: string;
  eventDate: string;
}

export type VoiceClientAction =
  | 'open_bag'
  | 'close_bag'
  | 'switch_tab_plan'
  | 'switch_tab_catalog'
  | 'save_plan'
  | 'scroll_brief'
  | 'scroll_workspace'
  | 'scroll_portion_guide';

export interface OrderConfirmation {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  deliveryAddress: string;
  fulfillmentMethod: 'delivery' | 'pickup';
  eventDate: string;
  estimatedDelivery: string;
  items: Array<{
    productId: string;
    name: string;
    unitLabel: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
}

export const HERO_IMAGE_URL = '/src/assets/images/hero_dinner_party_1795451262054.jpg';

const IMG_TABLEWARE = '/src/assets/images/cat_tableware_linens_1795451262138.jpg';
const IMG_DECOR = '/src/assets/images/cat_decor_florals_1795451262899.jpg';
const IMG_FOOD = '/src/assets/images/cat_food_catering_1795451262627.jpg';
const IMG_DRINKS = '/src/assets/images/cat_drinks_barware_1795451263100.jpg';
const IMG_FAVORS = '/src/assets/images/cat_favors_games_1795451262757.jpg';

export const CATALOG: Product[] = [
  // Tableware & Linens
  {
    id: 'tw-linen-napkins',
    name: 'Belgian Stonewashed Linen Napkins',
    brand: 'Atelier Loom',
    category: 'Tableware & Linens',
    price: 44,
    unitLabel: 'Set of 6',
    servesCount: 6,
    description: 'Pre-washed heavyweight flax linen napkins in warm oatmeal with mitered corners.',
    imageUrl: IMG_TABLEWARE,
    dietaryTags: [],
    themes: ['modern-dinner', 'garden-soiree', 'milestone-brunch'],
    inStock: true,
  },
  {
    id: 'tw-fluted-coupes',
    name: 'Fluted Crystal Coupe Glasses',
    brand: 'Verrerie Nord',
    category: 'Tableware & Linens',
    price: 56,
    unitLabel: 'Set of 6',
    servesCount: 6,
    description: 'Fine-rimmed ribbed crystal coupes suited for sparkling aperitifs, sours, and desserts.',
    imageUrl: IMG_TABLEWARE,
    dietaryTags: [],
    themes: ['modern-dinner', 'cocktail-lounge', 'milestone-brunch'],
    inStock: true,
  },
  {
    id: 'tw-stoneware-plates',
    name: 'Speckled Matte Stoneware Appetizer Plates',
    brand: 'Kiln & Clay',
    category: 'Tableware & Linens',
    price: 48,
    unitLabel: 'Set of 6',
    servesCount: 6,
    description: 'Low-profile 8-inch ceramic sharing plates in warm limestone glaze.',
    imageUrl: IMG_TABLEWARE,
    dietaryTags: [],
    themes: ['modern-dinner', 'garden-soiree', 'game-night'],
    inStock: true,
  },
  {
    id: 'tw-compostable-service',
    name: 'Pressed Palm Leaf Plates & Birch Cutlery Pack',
    brand: 'Terra Table',
    category: 'Tableware & Linens',
    price: 24,
    unitLabel: 'Serves 12',
    servesCount: 12,
    description: 'Sturdy compostable dinnerware with unbleached cocktail napkins for effortless cleanup.',
    imageUrl: IMG_TABLEWARE,
    dietaryTags: [],
    themes: ['garden-soiree', 'game-night', 'casual-housewarming'],
    inStock: true,
  },

  // Decor & Florals
  {
    id: 'df-botanical-centerpiece',
    name: 'Sculptural Dried Botanical Centerpiece',
    brand: 'Field & Stem',
    category: 'Decor & Florals',
    price: 68,
    unitLabel: '1 Arrangement + Vase',
    servesCount: 10,
    description: 'Preserved eucalyptus, lunaria, and bunny tails arranged in a matte stoneware vessel.',
    imageUrl: IMG_DECOR,
    dietaryTags: [],
    themes: ['modern-dinner', 'garden-soiree', 'milestone-brunch'],
    inStock: true,
  },
  {
    id: 'df-brass-tapers',
    name: 'Brushed Brass Taper Holders & Beeswax Candles',
    brand: 'Foundry Light',
    category: 'Decor & Florals',
    price: 38,
    unitLabel: '4 Holders + 4 Tapers',
    servesCount: 8,
    description: 'Weighted solid brass holders paired with dripless ivory beeswax tapers.',
    imageUrl: IMG_TABLEWARE,
    dietaryTags: [],
    themes: ['modern-dinner', 'cocktail-lounge'],
    inStock: true,
  },
  {
    id: 'df-frosted-votives',
    name: 'Frosted Glass Votive & Tea Light Set',
    brand: 'Foundry Light',
    category: 'Decor & Florals',
    price: 28,
    unitLabel: 'Set of 8',
    servesCount: 12,
    description: 'Soft-diffused frosted glass vessels with 8-hour unscented soy tea lights.',
    imageUrl: IMG_DECOR,
    dietaryTags: [],
    themes: ['modern-dinner', 'cocktail-lounge', 'garden-soiree', 'casual-housewarming'],
    inStock: true,
  },
  {
    id: 'df-linen-runner',
    name: 'Wide Belgian Linen Table Runner',
    brand: 'Atelier Loom',
    category: 'Decor & Florals',
    price: 42,
    unitLabel: '120-inch Runner',
    servesCount: 12,
    description: 'Generously proportioned raw-edge flax runner anchoring 8 to 12 place settings.',
    imageUrl: IMG_DECOR,
    dietaryTags: [],
    themes: ['modern-dinner', 'garden-soiree', 'milestone-brunch'],
    inStock: true,
  },

  // Food & Catering
  {
    id: 'fc-charcuterie-kit',
    name: 'Artisanal Cheese & Charcuterie Grazing Board',
    brand: 'Mercato Provision',
    category: 'Food & Catering',
    price: 78,
    unitLabel: 'Serves 8',
    servesCount: 8,
    description: 'Aged Manchego, double-cream brie, prosciutto, fennel salami, figs, olives, and crackers.',
    imageUrl: IMG_FOOD,
    dietaryTags: [],
    themes: ['modern-dinner', 'cocktail-lounge', 'casual-housewarming'],
    inStock: true,
  },
  {
    id: 'fc-vegan-mezze',
    name: 'Plant-Based Mediterranean Mezze Platter',
    brand: 'Sun & Olive',
    category: 'Food & Catering',
    price: 54,
    unitLabel: 'Serves 8',
    servesCount: 8,
    description: 'Whipped tahini hummus, charred baba ganoush, Castelvetrano olives, dolmas, and gluten-free seed crisps.',
    imageUrl: IMG_FOOD,
    dietaryTags: ['vegan', 'gluten-free', 'nut-free'],
    themes: ['modern-dinner', 'garden-soiree', 'cocktail-lounge', 'game-night'],
    inStock: true,
  },
  {
    id: 'fc-focaccia-oil',
    name: 'Rosemary Sourdough Focaccia & Estate Olive Oil',
    brand: 'Hearth & Crumb',
    category: 'Food & Catering',
    price: 26,
    unitLabel: '1 Half-Sheet (Serves 8)',
    servesCount: 8,
    description: 'Sea-salt blistered sourdough focaccia paired with cold-pressed Sicilian olive oil and aged balsamic.',
    imageUrl: IMG_FOOD,
    dietaryTags: ['vegan', 'nut-free'],
    themes: ['modern-dinner', 'garden-soiree', 'casual-housewarming'],
    inStock: true,
  },
  {
    id: 'fc-lemon-tarts',
    name: 'Petite Meyer Lemon & Thyme Tartlets',
    brand: 'Patisserie Claire',
    category: 'Food & Catering',
    price: 36,
    unitLabel: 'Box of 12',
    servesCount: 12,
    description: 'Crisp butter shortcrust shells filled with bright Meyer lemon curd and fresh thyme.',
    imageUrl: IMG_FOOD,
    dietaryTags: ['nut-free'],
    themes: ['modern-dinner', 'garden-soiree', 'milestone-brunch'],
    inStock: true,
  },
  {
    id: 'fc-gf-macarons',
    name: 'Almond & Pistachio French Macaron Assortment',
    brand: 'Patisserie Claire',
    category: 'Food & Catering',
    price: 34,
    unitLabel: 'Box of 12',
    servesCount: 12,
    description: 'Naturally gluten-free crisp meringue shells with dark chocolate ganache and pistachio buttercream.',
    imageUrl: IMG_FOOD,
    dietaryTags: ['gluten-free'],
    themes: ['milestone-brunch', 'cocktail-lounge', 'garden-soiree'],
    inStock: true,
  },
  {
    id: 'fc-spiced-nuts-olives',
    name: 'Rosemary Marcona Almonds & Citrus Olives Trio',
    brand: 'Mercato Provision',
    category: 'Food & Catering',
    price: 24,
    unitLabel: '3 Jars (Serves 10)',
    servesCount: 10,
    description: 'Bar-ready snack jars of roasted Marcona almonds, marinated olives, and smoked cashews.',
    imageUrl: IMG_FOOD,
    dietaryTags: ['vegan', 'gluten-free'],
    themes: ['cocktail-lounge', 'game-night', 'casual-housewarming'],
    inStock: true,
  },

  // Drinks & Barware
  {
    id: 'db-botanical-aperitif',
    name: 'Sparkling Botanical Non-Alcoholic Aperitif',
    brand: 'Elixir Botanicals',
    category: 'Drinks & Barware',
    price: 38,
    unitLabel: '2 × 750ml Bottles',
    servesCount: 10,
    description: 'Complex hibiscus, bitter orange peel, and gentian root aperitif crafted for celebratory toasts.',
    imageUrl: IMG_DRINKS,
    dietaryTags: ['vegan', 'gluten-free', 'nut-free', 'non-alcoholic'],
    themes: ['modern-dinner', 'garden-soiree', 'cocktail-lounge', 'milestone-brunch'],
    inStock: true,
  },
  {
    id: 'db-yuzu-mixers',
    name: 'Artisanal Yuzu & Citrus Blossom Tonic Mixers',
    brand: 'Sôl Mixers',
    category: 'Drinks & Barware',
    price: 22,
    unitLabel: '8-Pack (200ml)',
    servesCount: 8,
    description: 'Crisp small-batch botanical mixers tailored for gin, vodka, or zero-proof spritzes.',
    imageUrl: IMG_DRINKS,
    dietaryTags: ['vegan', 'gluten-free', 'nut-free', 'non-alcoholic'],
    themes: ['cocktail-lounge', 'garden-soiree', 'game-night', 'casual-housewarming'],
    inStock: true,
  },
  {
    id: 'db-ice-bucket',
    name: 'Faceted Crystal Ice Bucket & Brass Tongs',
    brand: 'Verrerie Nord',
    category: 'Drinks & Barware',
    price: 62,
    unitLabel: '1 Set',
    servesCount: 20,
    description: 'Heavy-base cut crystal chiller with brushed brass handle and serving tongs.',
    imageUrl: IMG_DRINKS,
    dietaryTags: [],
    themes: ['cocktail-lounge', 'modern-dinner'],
    inStock: true,
  },
  {
    id: 'db-citrus-garnish',
    name: 'Dehydrated Blood Orange Garnish Apothecary Jar',
    brand: 'Sôl Mixers',
    category: 'Drinks & Barware',
    price: 16,
    unitLabel: '30 Slices',
    servesCount: 30,
    description: 'Slow-dried vibrant blood orange wheels that elevate cocktails, mocktails, and sparkling water.',
    imageUrl: IMG_DRINKS,
    dietaryTags: ['vegan', 'gluten-free', 'nut-free', 'non-alcoholic'],
    themes: ['cocktail-lounge', 'modern-dinner', 'milestone-brunch', 'garden-soiree'],
    inStock: true,
  },

  // Favors & Games
  {
    id: 'fg-amber-candles',
    name: 'Hand-Poured Wild Fig & Cedar Travel Candles',
    brand: 'The Gathering Atelier',
    category: 'Favors & Games',
    price: 54,
    unitLabel: 'Set of 6 Favors',
    servesCount: 6,
    description: '4oz amber apothecary jars with 25-hour soy-coconut wax burn time, gift-boxed for guests.',
    imageUrl: IMG_FAVORS,
    dietaryTags: [],
    themes: ['modern-dinner', 'garden-soiree', 'milestone-brunch'],
    inStock: true,
  },
  {
    id: 'fg-conversation-deck',
    name: 'Linen-Bound Dinner Table Conversation Deck',
    brand: 'The Gathering Atelier',
    category: 'Favors & Games',
    price: 28,
    unitLabel: '50 Prompt Cards',
    servesCount: 16,
    description: 'Foil-stamped linen keepsake box containing thoughtful icebreakers and storytelling prompts.',
    imageUrl: IMG_FAVORS,
    dietaryTags: [],
    themes: ['modern-dinner', 'game-night', 'casual-housewarming'],
    inStock: true,
  },
  {
    id: 'fg-instant-film',
    name: 'Instant Guestbook Film Twin Pack & Velvet Tags',
    brand: 'Keepsake Press',
    category: 'Favors & Games',
    price: 36,
    unitLabel: '16 Exposures + Tags',
    servesCount: 16,
    description: 'Color instant film cartridges paired with cream cardstock gift tags and forest velvet ribbon.',
    imageUrl: IMG_FAVORS,
    dietaryTags: [],
    themes: ['milestone-brunch', 'cocktail-lounge', 'garden-soiree', 'casual-housewarming'],
    inStock: true,
  },
];

export const CATEGORY_IMAGES: Record<ProductCategory, string> = {
  'Tableware & Linens': IMG_TABLEWARE,
  'Decor & Florals': IMG_DECOR,
  'Food & Catering': IMG_FOOD,
  'Drinks & Barware': IMG_DRINKS,
  'Favors & Games': IMG_FAVORS,
};

export interface ResolvedBagItem {
  productId: string;
  name: string;
  brand: string;
  category: ProductCategory;
  unitPrice: number;
  unitLabel: string;
  servesCount: number;
  description: string;
  imageUrl: string;
  dietaryTags: DietaryTag[];
  isCustom: boolean;
}

export function getProductById(id: string): Product | undefined {
  return CATALOG.find((p) => p.id === id);
}

export function getBagItemDetails(item: BagItem): ResolvedBagItem | undefined {
  if (item.customItem) {
    return {
      productId: item.productId,
      name: item.customItem.name,
      brand: 'Custom Host Item',
      category: item.customItem.category,
      unitPrice: item.customItem.unitPrice,
      unitLabel: item.customItem.unitLabel,
      servesCount: item.customItem.servesCount,
      description: item.note || 'Added manually to your CymbalMart party list.',
      imageUrl: CATEGORY_IMAGES[item.customItem.category] || IMG_TABLEWARE,
      dietaryTags: [],
      isCustom: true,
    };
  }
  const product = getProductById(item.productId);
  if (!product) return undefined;
  return {
    productId: product.id,
    name: product.name,
    brand: product.brand,
    category: product.category,
    unitPrice: product.price,
    unitLabel: product.unitLabel,
    servesCount: product.servesCount,
    description: product.description,
    imageUrl: product.imageUrl,
    dietaryTags: product.dietaryTags,
    isCustom: false,
  };
}

export function calculateBagSubtotal(bag: BagItem[]): number {
  return bag.reduce((sum, item) => {
    const resolved = getBagItemDetails(item);
    return sum + (resolved ? resolved.unitPrice * item.quantity : 0);
  }, 0);
}

export function calculateCategoryBreakdown(
  bag: BagItem[]
): Array<{ category: ProductCategory; amount: number; sharePct: number }> {
  const subtotal = calculateBagSubtotal(bag);
  const totals = new Map<ProductCategory, number>();
  for (const cat of PRODUCT_CATEGORIES) {
    totals.set(cat, 0);
  }
  for (const item of bag) {
    const resolved = getBagItemDetails(item);
    if (!resolved) continue;
    totals.set(
      resolved.category,
      (totals.get(resolved.category) || 0) + resolved.unitPrice * item.quantity
    );
  }
  return PRODUCT_CATEGORIES.map((category) => {
    const amount = totals.get(category) || 0;
    return {
      category,
      amount,
      sharePct: subtotal > 0 ? Math.round((amount / subtotal) * 100) : 0,
    };
  });
}
