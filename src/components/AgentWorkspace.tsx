import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  Download,
  Minus,
  Plus,
  RotateCcw,
  Search,
  Send,
  ShoppingBag,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import {
  CATALOG,
  PRODUCT_CATEGORIES,
  calculateBagSubtotal,
  calculateCategoryBreakdown,
  getBagItemDetails,
  type BagItem,
  type ChatMessage,
  type CustomBagItemDetails,
  type PartyBrief,
  type ProductCategory,
} from '../shared/catalog';
import { ResilientImage } from './ResilientImage';

interface AgentWorkspaceProps {
  brief: PartyBrief;
  bag: BagItem[];
  fulfillmentMethod: 'delivery' | 'pickup';
  onChangeFulfillment: (method: 'delivery' | 'pickup') => void;
  onChangeBudgetLimit: (budgetLimit: number) => void;
  messages: ChatMessage[];
  isAgentThinking: boolean;
  agentError: string | null;
  activeTab: 'plan' | 'catalog';
  onChangeTab: (tab: 'plan' | 'catalog') => void;
  onUpdateQty: (productId: string, qty: number) => void;
  onUpdateCustomPrice: (productId: string, unitPrice: number) => void;
  onAddProduct: (productId: string, qty?: number) => void;
  onAddCustomItem: (custom: CustomBagItemDetails, qty: number) => void;
  onClearBag: () => void;
  onSendMessage: (prompt: string) => void;
  onAlignToBudget: () => void;
  onExportPlan: () => void;
  onOpenCheckout: () => void;
  onResetChat: () => void;
}

const QUICK_PROMPTS = [
  'Make food vegan & gluten-free',
  'Add a zero-proof spritz bar',
  'Switch to easy-cleanup tableware',
  'Add party favors for guests',
];

const CATEGORY_BAR_COLORS: Record<ProductCategory, string> = {
  'Tableware & Linens': '#164E3B',
  'Decor & Florals': '#A17A3E',
  'Food & Catering': '#3F6212',
  'Drinks & Barware': '#0F766E',
  'Favors & Games': '#52524E',
};

export function AgentWorkspace({
  brief,
  bag,
  fulfillmentMethod,
  onChangeFulfillment,
  onChangeBudgetLimit,
  messages,
  isAgentThinking,
  agentError,
  activeTab,
  onChangeTab,
  onUpdateQty,
  onUpdateCustomPrice,
  onAddProduct,
  onAddCustomItem,
  onClearBag,
  onSendMessage,
  onAlignToBudget,
  onExportPlan,
  onOpenCheckout,
  onResetChat,
}: AgentWorkspaceProps) {
  const [selectedCategory, setSelectedCategory] = useState<'All' | ProductCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');

  // Quick-add controls inside Curated List
  const [quickAddMode, setQuickAddMode] = useState<'catalog' | 'custom'>('catalog');
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>(CATALOG[0].id);
  const [catalogAddQty, setCatalogAddQty] = useState<number>(1);

  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState<ProductCategory>('Food & Catering');
  const [customPrice, setCustomPrice] = useState<string>('25');
  const [customQty, setCustomQty] = useState<number>(1);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, isAgentThinking]);

  const subtotal = calculateBagSubtotal(bag);
  const totalUnits = bag.reduce((sum, item) => sum + item.quantity, 0);
  const deliveryFee =
    subtotal === 0
      ? 0
      : fulfillmentMethod === 'pickup'
        ? 0
        : subtotal >= 250
          ? 0
          : 18;
  const estimatedTax = Math.round(subtotal * 0.0825 * 100) / 100;
  const estimatedGrandTotal = subtotal + deliveryFee + estimatedTax;

  const costPerGuest = brief.guestCount > 0 ? subtotal / brief.guestCount : 0;
  const budgetDelta = brief.budgetLimit - subtotal;
  const budgetPercent =
    brief.budgetLimit > 0 ? Math.min(100, (subtotal / brief.budgetLimit) * 100) : 0;
  const isOverBudget = budgetDelta < 0;

  const categoryBreakdown = calculateCategoryBreakdown(bag);

  const filteredCatalog = CATALOG.filter((product) => {
    const matchesCategory =
      selectedCategory === 'All' || product.category === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      product.name.toLowerCase().includes(q) ||
      product.description.toLowerCase().includes(q) ||
      product.brand.toLowerCase().includes(q) ||
      product.dietaryTags.some((t) => t.includes(q));
    return matchesCategory && matchesSearch;
  });

  const filteredBag = bag.filter((item) => {
    const resolved = getBagItemDetails(item);
    if (!resolved) return false;
    return selectedCategory === 'All' || resolved.category === selectedCategory;
  });

  const handleSubmitChat = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isAgentThinking) return;
    setInputText('');
    onSendMessage(trimmed);
  };

  const handleQuickAddCatalog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatalogId) return;
    onAddProduct(selectedCatalogId, Math.max(1, catalogAddQty));
    setCatalogAddQty(1);
  };

  const handleQuickAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const name = customName.trim();
    const unitPrice = Math.max(0, Number(customPrice) || 0);
    if (!name) return;
    onAddCustomItem(
      {
        name,
        category: customCategory,
        unitPrice,
        unitLabel: 'Custom item',
        servesCount: brief.guestCount,
      },
      Math.max(1, customQty)
    );
    setCustomName('');
    setCustomPrice('25');
    setCustomQty(1);
  };

  return (
    <section id="workspace" className="max-w-[1360px] mx-auto px-6 lg:px-10 py-10 lg:py-14">
      {/* CUJ Stage Bar: Define -> Review -> Refine & Checkout */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-6 border-b border-[#E5E5E0]">
        <div>
          <p className="text-xs font-medium tracking-wider uppercase text-[#5C5C57] mb-1">
            02. Review List · 03. Refine &amp; Checkout
          </p>
          <h2
            className="text-2xl font-medium text-[#141413] tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Live Shopping List &amp; Budget Calculator
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {bag.length > 0 && (
            <button
              type="button"
              onClick={onAlignToBudget}
              disabled={isAgentThinking}
              className={`h-9 px-3.5 inline-flex items-center gap-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 ${
                isOverBudget
                  ? 'bg-[#B45309] text-white border-[#B45309] hover:bg-[#92400E]'
                  : 'bg-white text-[#141413] border-[#D8D8D2] hover:border-[#164E3B]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>
                {isOverBudget
                  ? `Align to $${brief.budgetLimit} Budget`
                  : `Optimize Within $${brief.budgetLimit}`}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onExportPlan}
            disabled={bag.length === 0}
            className="h-9 px-3.5 inline-flex items-center gap-1.5 text-xs font-medium text-[#141413] bg-white border border-[#D8D8D2] hover:border-[#141413] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save Plan</span>
          </button>

          <button
            type="button"
            onClick={onOpenCheckout}
            disabled={bag.length === 0}
            className="h-9 px-4 inline-flex items-center gap-1.5 text-xs font-medium text-white bg-[#164E3B] hover:bg-[#113D2E] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Finalize &amp; Checkout</span>
          </button>
        </div>
      </div>

      {/* Live Recalculated Budget & Category Breakdown Strip */}
      <div className="bg-white border border-[#E5E5E0] rounded-xl p-5 sm:p-6 mb-8 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-medium text-[#5C5C57]">
                List Subtotal vs. Budget
              </span>
              <label htmlFor="inline-budget-input" className="sr-only">
                Edit target budget
              </label>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-medium font-mono tabular-nums text-[#141413]">
                ${subtotal.toFixed(2)}
              </span>
              <span className="text-xs text-[#5C5C57]">/ $</span>
              <input
                id="inline-budget-input"
                type="number"
                min={50}
                max={10000}
                step={25}
                value={brief.budgetLimit}
                onChange={(e) =>
                  onChangeBudgetLimit(Math.max(50, Number(e.target.value) || 50))
                }
                aria-label="Target budget in USD"
                className="w-20 h-7 px-2 bg-[#F8F8F6] border border-[#D8D8D2] rounded text-xs font-mono tabular-nums text-[#141413] focus:outline-none focus:border-[#164E3B]"
              />
            </div>
            <div className="mt-2.5 h-1.5 bg-[#EFEEEA] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isOverBudget ? 'bg-[#B45309]' : 'bg-[#164E3B]'
                }`}
                style={{ width: `${budgetPercent}%` }}
              />
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-[#5C5C57] mb-1">
              Budget Alignment
            </div>
            <div
              className={`text-lg font-medium font-mono tabular-nums ${
                isOverBudget ? 'text-[#B45309]' : 'text-[#164E3B]'
              }`}
            >
              {isOverBudget
                ? `$${Math.abs(budgetDelta).toFixed(2)} over budget`
                : `$${budgetDelta.toFixed(2)} remaining`}
            </div>
            <div className="text-xs text-[#52524E] mt-1 font-mono tabular-nums">
              ${costPerGuest.toFixed(2)} / guest ({brief.guestCount} guests)
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-medium text-[#5C5C57]">
                Estimated Order Total
              </span>
              <div className="inline-flex p-0.5 bg-[#F3F3EF] border border-[#E5E5E0] rounded">
                <button
                  type="button"
                  onClick={() => onChangeFulfillment('delivery')}
                  className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors cursor-pointer ${
                    fulfillmentMethod === 'delivery'
                      ? 'bg-white text-[#141413] shadow-2xs'
                      : 'text-[#5C5C57]'
                  }`}
                >
                  Delivery
                </button>
                <button
                  type="button"
                  onClick={() => onChangeFulfillment('pickup')}
                  className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors cursor-pointer ${
                    fulfillmentMethod === 'pickup'
                      ? 'bg-white text-[#141413] shadow-2xs'
                      : 'text-[#5C5C57]'
                  }`}
                >
                  Pickup
                </button>
              </div>
            </div>
            <div className="text-lg font-medium font-mono tabular-nums text-[#141413]">
              ${estimatedGrandTotal.toFixed(2)}
            </div>
            <div className="text-xs text-[#52524E] mt-1 font-mono tabular-nums">
              Tax ${estimatedTax.toFixed(2)} ·{' '}
              {deliveryFee === 0 ? 'Free shipping/pickup' : `Delivery $${deliveryFee}`}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-[#5C5C57] mb-1">
              Active List Volume
            </div>
            <div className="text-lg font-medium font-mono tabular-nums text-[#141413]">
              {bag.length} items · {totalUnits} units
            </div>
            <div className="text-xs text-[#52524E] mt-1">
              Updates recalculate all totals live
            </div>
          </div>
        </div>

        {/* Live Category Allocation Bar */}
        <div className="pt-4 border-t border-[#F0EFEA]">
          <div className="h-2 w-full bg-[#EFEEEA] rounded-full overflow-hidden flex mb-2.5">
            {categoryBreakdown.map((entry) =>
              entry.amount > 0 && subtotal > 0 ? (
                <div
                  key={entry.category}
                  title={`${entry.category}: $${entry.amount.toFixed(2)} (${entry.sharePct}%)`}
                  style={{
                    width: `${(entry.amount / subtotal) * 100}%`,
                    backgroundColor: CATEGORY_BAR_COLORS[entry.category],
                  }}
                  className="h-full transition-all duration-300"
                />
              ) : null
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-[#52524E]">
            {categoryBreakdown.map((entry) => (
              <div key={entry.category} className="inline-flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-xs shrink-0"
                  style={{ backgroundColor: CATEGORY_BAR_COLORS[entry.category] }}
                  aria-hidden="true"
                />
                <span>{entry.category}:</span>
                <span className="font-mono tabular-nums font-medium text-[#141413]">
                  ${entry.amount.toFixed(0)}
                </span>
                <span className="font-mono tabular-nums text-[#787872]">
                  ({entry.sharePct}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Cols: Shopping Plan + Curated Catalog */}
        <div className="lg:col-span-7 space-y-5" id="catalog-view">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="inline-flex items-center p-1 bg-[#EFEEEA] border border-[#E5E5E0] rounded-lg self-start">
              <button
                type="button"
                onClick={() => onChangeTab('plan')}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'plan'
                    ? 'bg-white text-[#141413] shadow-xs'
                    : 'text-[#52524E] hover:text-[#141413]'
                }`}
              >
                Shopping List ({bag.length})
              </button>
              <button
                type="button"
                onClick={() => onChangeTab('catalog')}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'catalog'
                    ? 'bg-white text-[#141413] shadow-xs'
                    : 'text-[#52524E] hover:text-[#141413]'
                }`}
              >
                CymbalMart Catalog ({CATALOG.length})
              </button>
            </div>

            {activeTab === 'catalog' ? (
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-[#5C5C57] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tableware, vegan, drinks..."
                  aria-label="Search CymbalMart catalog"
                  className="w-full h-9 pl-8 pr-3 bg-white border border-[#D8D8D2] rounded-lg text-xs text-[#141413] placeholder:text-[#787872] focus:outline-none focus:border-[#164E3B]"
                />
              </div>
            ) : (
              bag.length > 0 && (
                <button
                  type="button"
                  onClick={onClearBag}
                  className="text-xs font-medium text-[#5C5C57] hover:text-[#B91C1C] transition-colors self-start sm:self-auto cursor-pointer"
                >
                  Clear list
                </button>
              )
            )}
          </div>

          {/* Category Filter Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {(['All', ...PRODUCT_CATEGORIES] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#141413] text-white border-[#141413]'
                    : 'bg-white text-[#52524E] border-[#E5E5E0] hover:border-[#C9C9C2] hover:text-[#141413]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {activeTab === 'plan' ? (
            <div className="space-y-4">
              {/* Direct Quick-Add Bar inside Shopping List */}
              <div className="bg-white border border-[#E5E5E0] rounded-xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-medium text-[#141413]">
                    Update List Directly
                  </span>
                  <div className="inline-flex p-0.5 bg-[#F3F3EF] border border-[#E5E5E0] rounded-md">
                    <button
                      type="button"
                      onClick={() => setQuickAddMode('catalog')}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                        quickAddMode === 'catalog'
                          ? 'bg-white text-[#141413] shadow-2xs'
                          : 'text-[#52524E]'
                      }`}
                    >
                      From Catalog
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickAddMode('custom')}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                        quickAddMode === 'custom'
                          ? 'bg-white text-[#141413] shadow-2xs'
                          : 'text-[#52524E]'
                      }`}
                    >
                      + Custom Item
                    </button>
                  </div>
                </div>

                {quickAddMode === 'catalog' ? (
                  <form
                    onSubmit={handleQuickAddCatalog}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                  >
                    <select
                      aria-label="Choose CymbalMart item to add"
                      value={selectedCatalogId}
                      onChange={(e) => setSelectedCatalogId(e.target.value)}
                      className="flex-1 h-9 px-3 bg-[#F8F8F6] border border-[#D8D8D2] rounded-lg text-xs text-[#141413] focus:outline-none focus:border-[#164E3B]"
                    >
                      {CATALOG.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — ${p.price} ({p.unitLabel})
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
                      <label htmlFor="quick-catalog-qty" className="text-xs text-[#5C5C57]">
                        Qty
                      </label>
                      <input
                        id="quick-catalog-qty"
                        type="number"
                        min={1}
                        max={50}
                        value={catalogAddQty}
                        onChange={(e) =>
                          setCatalogAddQty(Math.max(1, Number(e.target.value) || 1))
                        }
                        className="w-16 h-9 px-2 bg-[#F8F8F6] border border-[#D8D8D2] rounded-lg text-xs font-mono tabular-nums text-[#141413] text-center focus:outline-none focus:border-[#164E3B]"
                      />
                      <button
                        type="submit"
                        className="h-9 px-4 inline-flex items-center gap-1.5 bg-[#141413] hover:bg-[#2C2C2A] text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add to List</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <form
                    onSubmit={handleQuickAddCustom}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                  >
                    <input
                      type="text"
                      required
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Item name (e.g., Bakery Cake, Ice Bags)"
                      aria-label="Custom item name"
                      className="sm:col-span-5 h-9 px-3 bg-[#F8F8F6] border border-[#D8D8D2] rounded-lg text-xs text-[#141413] placeholder:text-[#787872] focus:outline-none focus:border-[#164E3B]"
                    />
                    <select
                      aria-label="Custom item category"
                      value={customCategory}
                      onChange={(e) =>
                        setCustomCategory(e.target.value as ProductCategory)
                      }
                      className="sm:col-span-3 h-9 px-2 bg-[#F8F8F6] border border-[#D8D8D2] rounded-lg text-xs text-[#141413] focus:outline-none focus:border-[#164E3B]"
                    >
                      {PRODUCT_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <div className="sm:col-span-2 relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[#5C5C57]">
                        $
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        required
                        value={customPrice}
                        onChange={(e) => setCustomPrice(e.target.value)}
                        aria-label="Custom item unit price"
                        className="w-full h-9 pl-6 pr-2 bg-[#F8F8F6] border border-[#D8D8D2] rounded-lg text-xs font-mono tabular-nums text-[#141413] focus:outline-none focus:border-[#164E3B]"
                      />
                    </div>
                    <div className="sm:col-span-2 flex items-center gap-1.5">
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={customQty}
                        onChange={(e) =>
                          setCustomQty(Math.max(1, Number(e.target.value) || 1))
                        }
                        aria-label="Custom item quantity"
                        className="w-12 h-9 px-1 bg-[#F8F8F6] border border-[#D8D8D2] rounded-lg text-xs font-mono tabular-nums text-[#141413] text-center focus:outline-none focus:border-[#164E3B]"
                      />
                      <button
                        type="submit"
                        className="flex-1 h-9 px-3 inline-flex items-center justify-center bg-[#164E3B] hover:bg-[#113D2E] text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {filteredBag.length === 0 ? (
                <div className="bg-white border border-[#E5E5E0] rounded-xl p-10 text-center">
                  <ShoppingBag
                    className="w-7 h-7 text-[#787872] mx-auto mb-3"
                    strokeWidth={1.5}
                  />
                  <h3
                    className="text-lg font-medium text-[#141413] mb-1.5"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {bag.length === 0
                      ? 'Your CymbalMart list is empty'
                      : `No items in ${selectedCategory}`}
                  </h3>
                  <p className="text-xs text-[#52524E] max-w-[42ch] mx-auto mb-5">
                    {bag.length === 0
                      ? 'Use the quick-add bar above, generate a plan from your Event Brief, or browse the catalog.'
                      : 'Switch category filters or add products using the bar above.'}
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        onSendMessage(
                          `Curate a complete ${brief.occasion} shopping list for ${brief.guestCount} guests under $${brief.budgetLimit}.`
                        )
                      }
                      className="px-4 py-2 text-xs font-medium text-white bg-[#164E3B] hover:bg-[#113D2E] rounded-lg transition-colors cursor-pointer"
                    >
                      Ask Agent to Curate List
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory('All');
                        onChangeTab('catalog');
                      }}
                      className="px-4 py-2 text-xs font-medium text-[#141413] bg-[#F3F3EF] hover:bg-[#E8E8E2] rounded-lg transition-colors cursor-pointer"
                    >
                      Browse Catalog
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-[#E5E5E0] rounded-xl divide-y divide-[#E5E5E0]">
                  {filteredBag.map((item) => {
                    const resolved = getBagItemDetails(item);
                    if (!resolved) return null;
                    const lineTotal = resolved.unitPrice * item.quantity;
                    const servesTotal = resolved.servesCount * item.quantity;
                    const budgetSharePct =
                      subtotal > 0 ? Math.round((lineTotal / subtotal) * 100) : 0;

                    return (
                      <div
                        key={resolved.productId}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center"
                      >
                        <div className="w-full sm:w-24 aspect-[4/3] rounded-lg overflow-hidden border border-[#E5E5E0] bg-[#F8F8F6] shrink-0">
                          <ResilientImage
                            src={resolved.imageUrl}
                            alt={resolved.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-[#5C5C57] mb-0.5 truncate">
                            {resolved.category} · {resolved.unitLabel} · Covers{' '}
                            {servesTotal} guests · {budgetSharePct}% of spend
                            {resolved.dietaryTags.length > 0 &&
                              ` · ${resolved.dietaryTags.join(', ')}`}
                          </div>
                          <h3 className="text-[15px] font-semibold text-[#141413] leading-snug">
                            {resolved.name}
                          </h3>
                          <p className="text-xs text-[#52524E] mt-0.5 line-clamp-1">
                            {item.note || resolved.description}
                          </p>

                          <div className="flex flex-wrap items-center gap-3 mt-3">
                            <div className="inline-flex items-center border border-[#D8D8D2] rounded-lg bg-[#F8F8F6]">
                              <button
                                type="button"
                                aria-label={`Decrease ${resolved.name}`}
                                onClick={() =>
                                  onUpdateQty(resolved.productId, item.quantity - 1)
                                }
                                className="w-8 h-8 flex items-center justify-center text-[#52524E] hover:text-[#141413] cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={99}
                                aria-label={`Quantity for ${resolved.name}`}
                                value={item.quantity}
                                onChange={(e) => {
                                  const next = Math.max(1, Number(e.target.value) || 1);
                                  onUpdateQty(resolved.productId, next);
                                }}
                                className="w-10 h-8 bg-transparent text-center text-xs font-mono tabular-nums font-medium text-[#141413] focus:outline-none"
                              />
                              <button
                                type="button"
                                aria-label={`Increase ${resolved.name}`}
                                onClick={() =>
                                  onUpdateQty(resolved.productId, item.quantity + 1)
                                }
                                className="w-8 h-8 flex items-center justify-center text-[#52524E] hover:text-[#141413] cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {resolved.isCustom ? (
                              <div className="inline-flex items-center gap-1.5 text-xs text-[#52524E]">
                                <span>Unit $:</span>
                                <input
                                  type="number"
                                  min={0}
                                  step={1}
                                  aria-label={`Unit price for ${resolved.name}`}
                                  value={resolved.unitPrice}
                                  onChange={(e) =>
                                    onUpdateCustomPrice(
                                      resolved.productId,
                                      Math.max(0, Number(e.target.value) || 0)
                                    )
                                  }
                                  className="w-16 h-8 px-2 bg-[#F8F8F6] border border-[#D8D8D2] rounded-lg text-xs font-mono tabular-nums text-[#141413] focus:outline-none focus:border-[#164E3B]"
                                />
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  onSendMessage(
                                    `Find a CymbalMart alternative to "${resolved.name}" (id: ${resolved.productId}) that matches my budget ($${brief.budgetLimit}) and constraints, and swap it into my bag.`
                                  )
                                }
                                disabled={isAgentThinking}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#52524E] hover:text-[#141413] border border-[#E5E5E0] hover:border-[#C9C9C2] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                              >
                                <ArrowLeftRight className="w-3 h-3" />
                                <span>Swap with Agent</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => onUpdateQty(resolved.productId, 0)}
                              aria-label={`Remove ${resolved.name}`}
                              className="inline-flex items-center gap-1 text-xs text-[#5C5C57] hover:text-[#B91C1C] transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>

                        <div className="sm:text-right shrink-0 self-end sm:self-center">
                          <div className="text-base font-medium font-mono tabular-nums text-[#141413]">
                            ${lineTotal.toFixed(0)}
                          </div>
                          <div className="text-xs font-mono tabular-nums text-[#5C5C57]">
                            ${resolved.unitPrice} / pack
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredCatalog.map((product) => {
                const inBagItem = bag.find((b) => b.productId === product.id);
                return (
                  <article
                    key={product.id}
                    className="bg-white border border-[#E5E5E0] rounded-xl overflow-hidden flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    <div>
                      <div className="aspect-[4/3] bg-[#F3F3EF] border-b border-[#E5E5E0] overflow-hidden">
                        <ResilientImage
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-4">
                        <div className="text-[11px] uppercase tracking-wider text-[#5C5C57] mb-1 truncate">
                          {product.brand} · {product.unitLabel}
                        </div>
                        <h3 className="text-[15px] font-semibold text-[#141413] leading-snug mb-1.5">
                          {product.name}
                        </h3>
                        <p className="text-xs text-[#52524E] leading-relaxed line-clamp-2">
                          {product.description}
                        </p>
                        {product.dietaryTags.length > 0 && (
                          <p className="text-[11px] text-[#164E3B] mt-2 font-medium">
                            {product.dietaryTags.join(' · ')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="px-4 pb-4 pt-2 flex items-center justify-between gap-2 border-t border-[#F0EFEA]">
                      <div>
                        <span className="text-sm font-medium font-mono tabular-nums text-[#141413]">
                          ${product.price}
                        </span>
                        <span className="text-[11px] text-[#5C5C57] ml-1.5">
                          Serves {product.servesCount}
                        </span>
                      </div>

                      {inBagItem ? (
                        <div className="inline-flex items-center border border-[#164E3B]/30 rounded-lg bg-[#164E3B]/8">
                          <button
                            type="button"
                            aria-label={`Decrease ${product.name}`}
                            onClick={() =>
                              onUpdateQty(product.id, inBagItem.quantity - 1)
                            }
                            className="w-7 h-7 flex items-center justify-center text-[#164E3B] hover:bg-[#164E3B]/15 rounded-l-lg cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 text-xs font-mono tabular-nums font-medium text-[#164E3B]">
                            {inBagItem.quantity}
                          </span>
                          <button
                            type="button"
                            aria-label={`Increase ${product.name}`}
                            onClick={() =>
                              onUpdateQty(product.id, inBagItem.quantity + 1)
                            }
                            className="w-7 h-7 flex items-center justify-center text-[#164E3B] hover:bg-[#164E3B]/15 rounded-r-lg cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onAddProduct(product.id, 1)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-[#141413] hover:bg-[#2C2C2A] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 5 Cols: CymbalMart Shopping Agent Panel */}
        <aside className="lg:col-span-5 lg:sticky lg:top-22 bg-white border border-[#E5E5E0] rounded-xl flex flex-col h-[620px]">
          <div className="px-5 py-4 border-b border-[#E5E5E0] flex items-center justify-between gap-4">
            <div>
              <h2
                className="text-base font-medium text-[#141413]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                CymbalMart Shopping Agent
              </h2>
              <p className="text-xs text-[#5C5C57]">
                Refines constraints, swaps items &amp; aligns budget
              </p>
            </div>
            <button
              type="button"
              onClick={onResetChat}
              title="Reset conversation"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#52524E] hover:text-[#141413] hover:bg-[#F3F3EF] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New Thread</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[90%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#141413] text-white'
                      : 'bg-[#F8F8F6] border border-[#E5E5E0] text-[#141413]'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>

                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-[#E5E5E0] space-y-1">
                      <div className="text-[11px] font-medium uppercase tracking-wider text-[#5C5C57]">
                        CymbalMart Bag Updates
                      </div>
                      <ul className="space-y-1">
                        {msg.actions.map((act, idx) => (
                          <li
                            key={`${msg.id}-act-${idx}`}
                            className="text-xs text-[#164E3B] flex items-center justify-between gap-2"
                          >
                            <span className="truncate">{act.summary}</span>
                            {typeof act.deltaAmount === 'number' && act.deltaAmount !== 0 && (
                              <span className="font-mono tabular-nums shrink-0 text-[#52524E]">
                                {act.deltaAmount > 0
                                  ? `+$${act.deltaAmount}`
                                  : `-$${Math.abs(act.deltaAmount)}`}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <span className="text-[11px] text-[#787872] mt-1 px-1">
                  {msg.role === 'user' ? 'Host' : 'CymbalMart Agent'} · {msg.timestamp}
                </span>
              </div>
            ))}

            {isAgentThinking && (
              <div className="flex flex-col items-start">
                <div className="max-w-[85%] rounded-xl px-4 py-3 bg-[#F8F8F6] border border-[#E5E5E0] space-y-2">
                  <div className="text-xs font-medium text-[#52524E]">
                    Checking CymbalMart inventory &amp; aligning budget...
                  </div>
                  <div className="h-2 w-44 bg-[#E5E5E0] rounded animate-pulse" />
                  <div className="h-2 w-32 bg-[#E5E5E0] rounded animate-pulse" />
                </div>
              </div>
            )}

            {agentError && (
              <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-xs text-[#B91C1C]">
                {agentError}
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          <div className="p-4 border-t border-[#E5E5E0] bg-[#FAF9F6] rounded-b-xl space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={isAgentThinking}
                  onClick={() => onSendMessage(prompt)}
                  className="px-2.5 py-1 text-[11px] font-medium text-[#52524E] bg-white border border-[#E5E5E0] hover:border-[#164E3B] hover:text-[#164E3B] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmitChat} className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Refine constraints, swap items, or adjust budget..."
                aria-label="Message CymbalMart Shopping Agent"
                disabled={isAgentThinking}
                className="flex-1 h-10 px-3.5 bg-white border border-[#D8D8D2] rounded-lg text-sm text-[#141413] placeholder:text-[#787872] focus:outline-none focus:border-[#164E3B] disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={isAgentThinking || !inputText.trim()}
                aria-label="Send message"
                className="h-10 px-4 inline-flex items-center justify-center gap-1.5 bg-[#164E3B] hover:bg-[#113D2E] disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </aside>
      </div>
    </section>
  );
}
