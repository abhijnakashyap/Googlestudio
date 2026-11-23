import { useState } from 'react';
import { Check, RefreshCw } from 'lucide-react';
import type { PartyBrief } from '../shared/catalog';

interface PortionCalculatorProps {
  brief: PartyBrief;
  onSyncEssentials: (durationHours: number, includeBuffer: boolean) => void;
}

export function PortionCalculator({
  brief,
  onSyncEssentials,
}: PortionCalculatorProps) {
  const [durationHours, setDurationHours] = useState<number>(4);
  const [includeBuffer, setIncludeBuffer] = useState<boolean>(true);
  const [justSynced, setJustSynced] = useState<boolean>(false);

  const guests = brief.guestCount;
  const appetizerPieces = guests * (durationHours === 2 ? 5 : durationHours === 4 ? 7 : 9);
  const drinkPours = guests * (durationHours === 2 ? 2 : durationHours === 4 ? 3 : 4);
  const glasswareNeeded = includeBuffer ? Math.ceil(guests * 1.15) : guests;
  const napkinsNeeded = guests * (durationHours >= 4 ? 2 : 1);
  const candlelightUnits = Math.max(4, Math.ceil(guests / 2));

  const handleSync = () => {
    onSyncEssentials(durationHours, includeBuffer);
    setJustSynced(true);
    setTimeout(() => setJustSynced(false), 2500);
  };

  return (
    <section id="portion-guide" className="border-t border-[#E5E5E0] bg-white">
      <div className="max-w-[1360px] mx-auto px-6 lg:px-10 py-12 lg:py-16">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-xs font-medium tracking-wider uppercase text-[#5C5C57] mb-2">
              Hosting Math
            </p>
            <h2
              className="text-2xl sm:text-3xl font-medium text-[#141413] tracking-tight [text-wrap:balance]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Guest &amp; Portion Calculator
            </h2>
            <p className="text-sm text-[#52524E] mt-1.5 max-w-[56ch]">
              Verify exact per-guest quantities for {guests} attendees based on your
              gathering duration, then sync essentials directly to your shopping bag.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center p-1 bg-[#F3F3EF] border border-[#E5E5E0] rounded-lg">
              {[
                { hrs: 2, label: '2h Cocktail' },
                { hrs: 4, label: '4h Dinner' },
                { hrs: 6, label: '6h Evening' },
              ].map((opt) => (
                <button
                  key={opt.hrs}
                  type="button"
                  onClick={() => setDurationHours(opt.hrs)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    durationHours === opt.hrs
                      ? 'bg-white text-[#141413] shadow-xs'
                      : 'text-[#52524E] hover:text-[#141413]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIncludeBuffer(!includeBuffer)}
              className={`h-9 px-3.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                includeBuffer
                  ? 'bg-[#164E3B]/8 border-[#164E3B]/30 text-[#164E3B]'
                  : 'bg-white border-[#D8D8D2] text-[#52524E]'
              }`}
            >
              +15% Glassware Buffer: {includeBuffer ? 'On' : 'Off'}
            </button>

            <button
              type="button"
              onClick={handleSync}
              className="h-9 px-4 inline-flex items-center gap-2 text-xs font-medium text-white bg-[#141413] hover:bg-[#2C2C2A] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {justSynced ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Quantities Synced</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync Essentials to Bag</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="p-5 bg-[#F8F8F6] border border-[#E5E5E0] rounded-xl">
            <div className="text-xs font-medium text-[#5C5C57] mb-1">
              Appetizer Bites
            </div>
            <div className="text-2xl font-medium tabular-nums text-[#141413] font-mono">
              {appetizerPieces}
            </div>
            <div className="text-xs text-[#52524E] mt-1">
              {Math.round(appetizerPieces / guests)} pieces per guest
            </div>
          </div>

          <div className="p-5 bg-[#F8F8F6] border border-[#E5E5E0] rounded-xl">
            <div className="text-xs font-medium text-[#5C5C57] mb-1">
              Beverage Pours
            </div>
            <div className="text-2xl font-medium tabular-nums text-[#141413] font-mono">
              {drinkPours}
            </div>
            <div className="text-xs text-[#52524E] mt-1">
              {Math.round(drinkPours / guests)} pours per guest
            </div>
          </div>

          <div className="p-5 bg-[#F8F8F6] border border-[#E5E5E0] rounded-xl">
            <div className="text-xs font-medium text-[#5C5C57] mb-1">
              Coupe Glassware
            </div>
            <div className="text-2xl font-medium tabular-nums text-[#141413] font-mono">
              {glasswareNeeded}
            </div>
            <div className="text-xs text-[#52524E] mt-1">
              {Math.ceil(glasswareNeeded / 6)} sets of 6 recommended
            </div>
          </div>

          <div className="p-5 bg-[#F8F8F6] border border-[#E5E5E0] rounded-xl">
            <div className="text-xs font-medium text-[#5C5C57] mb-1">
              Linen Napkins
            </div>
            <div className="text-2xl font-medium tabular-nums text-[#141413] font-mono">
              {napkinsNeeded}
            </div>
            <div className="text-xs text-[#52524E] mt-1">
              {Math.ceil(napkinsNeeded / 6)} sets of 6 recommended
            </div>
          </div>

          <div className="p-5 bg-[#F8F8F6] border border-[#E5E5E0] rounded-xl col-span-2 sm:col-span-1">
            <div className="text-xs font-medium text-[#5C5C57] mb-1">
              Taper &amp; Votive Lights
            </div>
            <div className="text-2xl font-medium tabular-nums text-[#141413] font-mono">
              {candlelightUnits}
            </div>
            <div className="text-xs text-[#52524E] mt-1">
              1 flame per 2 seated guests
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
