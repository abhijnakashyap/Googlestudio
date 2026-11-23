import { ShoppingBag } from 'lucide-react';

interface HeaderProps {
  itemCount: number;
  subtotal: number;
  onOpenBag: () => void;
}

export function Header({ itemCount, subtotal, onOpenBag }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-[#F8F8F6]/95 backdrop-blur-sm border-b border-[#E5E5E0]">
      <div className="max-w-[1360px] mx-auto px-6 lg:px-10 h-16 flex items-center justify-between gap-8">
        <a
          href="#top"
          className="text-xl font-medium tracking-tight text-[#141413] whitespace-nowrap shrink-0"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          CymbalMart
        </a>

        <nav
          aria-label="Primary"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#52524E]"
        >
          <a
            href="#brief"
            className="hover:text-[#141413] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-1"
          >
            Define Event
          </a>
          <a
            href="#workspace"
            className="hover:text-[#141413] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-1"
          >
            Review List
          </a>
          <a
            href="#catalog-view"
            className="hover:text-[#141413] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-1"
          >
            Refine Plan
          </a>
          <a
            href="#portion-guide"
            className="hover:text-[#141413] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-1"
          >
            Portion Guide
          </a>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenBag}
            className="inline-flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-white bg-[#164E3B] hover:bg-[#113D2E] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#164E3B]"
          >
            <ShoppingBag className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            <span className="tabular-nums">
              Checkout ({itemCount}) · ${subtotal.toFixed(0)}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
