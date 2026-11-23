import { ArrowRight, Minus, Plus } from 'lucide-react';
import { HERO_IMAGE_URL, type PartyBrief } from '../shared/catalog';
import { ResilientImage } from './ResilientImage';

interface HeroBriefProps {
  brief: PartyBrief;
  onChangeBrief: (next: PartyBrief) => void;
  onBuildPlan: () => void;
  isBuilding: boolean;
}

const PARTY_TYPES = [
  'Intimate Dinner Party',
  'Garden Cocktail Soirée',
  'Milestone Brunch',
  'Housewarming Gathering',
  'Game & Grazing Night',
];

const THEMES = [
  { id: 'modern-dinner', label: 'Modern Candlelit' },
  { id: 'garden-soiree', label: 'Garden Botanical' },
  { id: 'cocktail-lounge', label: 'Evening Cocktail' },
  { id: 'milestone-brunch', label: 'Sunlit Brunch' },
  { id: 'game-night', label: 'Relaxed Hosting' },
];

const DIETARY_OPTIONS = [
  'None specified',
  'Vegan & Plant-Based',
  'Gluten-Free',
  'Zero-Proof / Non-Alcoholic',
  'Nut-Free',
];

export function HeroBrief({
  brief,
  onChangeBrief,
  onBuildPlan,
  isBuilding,
}: HeroBriefProps) {
  const updateField = <K extends keyof PartyBrief>(key: K, value: PartyBrief[K]) => {
    onChangeBrief({ ...brief, [key]: value });
  };

  return (
    <section id="brief" className="border-b border-[#E5E5E0] bg-white">
      <div className="max-w-[1360px] mx-auto px-6 lg:px-10 py-10 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between">
            <div>
              <p className="text-xs font-medium tracking-wider uppercase text-[#5C5C57] mb-3">
                CymbalMart Shopping Agent · 01. Define Event
              </p>
              <h1
                className="text-3xl sm:text-4xl lg:text-[2.65rem] font-medium text-[#141413] leading-[1.12] tracking-tight mb-4 [text-wrap:balance]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Turn hosting intent into a budget-aligned shopping list.
              </h1>
              <p className="text-[15px] leading-relaxed text-[#52524E] max-w-[54ch] mb-7">
                Designed for busy hosts. Define your party type, theme, budget,
                guest count, and special requests below—CymbalMart&apos;s shopping agent
                builds and aligns your entire cart in seconds.
              </p>
            </div>

            <div className="bg-[#F8F8F6] border border-[#E5E5E0] rounded-xl p-5 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label
                    htmlFor="brief-occasion"
                    className="block text-xs font-medium text-[#52524E] mb-1.5"
                  >
                    Party Type
                  </label>
                  <select
                    id="brief-occasion"
                    value={brief.occasion}
                    onChange={(e) => updateField('occasion', e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-[#D8D8D2] rounded-lg text-sm text-[#141413] focus:outline-none focus:border-[#164E3B]"
                  >
                    {PARTY_TYPES.map((occ) => (
                      <option key={occ} value={occ}>
                        {occ}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="brief-theme"
                    className="block text-xs font-medium text-[#52524E] mb-1.5"
                  >
                    Theme
                  </label>
                  <select
                    id="brief-theme"
                    value={brief.theme}
                    onChange={(e) => updateField('theme', e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-[#D8D8D2] rounded-lg text-sm text-[#141413] focus:outline-none focus:border-[#164E3B]"
                  >
                    {THEMES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="block text-xs font-medium text-[#52524E] mb-1.5">
                    Guest Count
                  </span>
                  <div className="flex items-center justify-between h-10 px-2 bg-white border border-[#D8D8D2] rounded-lg">
                    <button
                      type="button"
                      aria-label="Decrease guest count"
                      onClick={() =>
                        updateField('guestCount', Math.max(4, brief.guestCount - 2))
                      }
                      className="w-8 h-8 flex items-center justify-center rounded text-[#52524E] hover:bg-[#F3F3EF] hover:text-[#141413] cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-medium tabular-nums text-[#141413]">
                      {brief.guestCount} guests
                    </span>
                    <button
                      type="button"
                      aria-label="Increase guest count"
                      onClick={() =>
                        updateField('guestCount', Math.min(60, brief.guestCount + 2))
                      }
                      className="w-8 h-8 flex items-center justify-center rounded text-[#52524E] hover:bg-[#F3F3EF] hover:text-[#141413] cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="brief-budget"
                    className="block text-xs font-medium text-[#52524E] mb-1.5"
                  >
                    Total Budget (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#5C5C57] tabular-nums">
                      $
                    </span>
                    <input
                      id="brief-budget"
                      type="number"
                      min={120}
                      max={5000}
                      step={25}
                      value={brief.budgetLimit}
                      onChange={(e) =>
                        updateField(
                          'budgetLimit',
                          Math.max(100, Number(e.target.value) || 100)
                        )
                      }
                      className="w-full h-10 pl-7 pr-3 bg-white border border-[#D8D8D2] rounded-lg text-sm tabular-nums text-[#141413] focus:outline-none focus:border-[#164E3B]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label
                    htmlFor="brief-dietary"
                    className="block text-xs font-medium text-[#52524E] mb-1.5"
                  >
                    Dietary Focus
                  </label>
                  <select
                    id="brief-dietary"
                    value={brief.dietaryNeeds}
                    onChange={(e) => updateField('dietaryNeeds', e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-[#D8D8D2] rounded-lg text-sm text-[#141413] focus:outline-none focus:border-[#164E3B]"
                  >
                    {DIETARY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="brief-special"
                    className="block text-xs font-medium text-[#52524E] mb-1.5"
                  >
                    Special Requests
                  </label>
                  <input
                    id="brief-special"
                    type="text"
                    value={brief.specialRequests}
                    onChange={(e) => updateField('specialRequests', e.target.value)}
                    placeholder="e.g., easy cleanup, extra candles, party favors"
                    className="w-full h-10 px-3 bg-white border border-[#D8D8D2] rounded-lg text-sm text-[#141413] placeholder:text-[#787872] focus:outline-none focus:border-[#164E3B]"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <p className="text-xs text-[#5C5C57]">
                  Next: Review aligned list &amp; refine constraints
                </p>
                <button
                  type="button"
                  onClick={onBuildPlan}
                  disabled={isBuilding}
                  className="h-10 px-5 inline-flex items-center justify-center gap-2 bg-[#164E3B] hover:bg-[#113D2E] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#164E3B]"
                >
                  <span>
                    {isBuilding ? 'Curating CymbalMart List...' : 'Generate Shopping List'}
                  </span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 flex">
            <div className="w-full rounded-xl overflow-hidden border border-[#E5E5E0] bg-[#EFEEEA] min-h-[280px] lg:min-h-[440px]">
              <ResilientImage
                src={HERO_IMAGE_URL}
                alt="Candlelit modern dinner party tablescape curated with CymbalMart tableware, florals, and stemware"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
