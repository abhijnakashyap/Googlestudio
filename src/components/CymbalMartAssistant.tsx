import { useEffect, useRef, useState } from 'react';
import { MessageSquare, RotateCcw, Send, X } from 'lucide-react';
import type { BagItem, ChatMessage, PartyBrief } from '../shared/catalog';

interface CymbalMartAssistantProps {
  brief: PartyBrief;
  bag: BagItem[];
  onBagUpdate: (nextBag: BagItem[]) => void;
}

const CUSTOMER_STARTERS = [
  'How does Store Pickup work?',
  'Which items are vegan & nut-free?',
  'What drinks pair with charcuterie?',
  'Do I qualify for free delivery?',
];

function formatTime(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function createInitialMessages(): ChatMessage[] {
  return [
    {
      id: 'cm-assistant-welcome',
      role: 'assistant',
      text: 'Hello! I am CymbalMart Assistant. Ask me about product ingredients, serving sizes, delivery vs. free store pickup, or tell me to add an item to your bag.',
      timestamp: formatTime(),
    },
  ];
}

export function CymbalMartAssistant({
  brief,
  bag,
  onBagUpdate,
}: CymbalMartAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(createInitialMessages);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [messages, isSending, isOpen]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    const userMsg: ChatMessage = {
      id: `cust-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: formatTime(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setErrorMsg(null);
    setIsSending(true);

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: messages.map((m) => ({ role: m.role, text: m.text })),
          brief,
          bag,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not reach CymbalMart Assistant.');
      }

      if (Array.isArray(data.bag)) {
        onBagUpdate(data.bag);
      }

      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        text: data.reply,
        actions: Array.isArray(data.actionsPerformed) ? data.actionsPerformed : [],
        timestamp: formatTime(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to connect to CymbalMart Assistant.'
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputText);
  };

  const handleReset = () => {
    setMessages(createInitialMessages());
    setErrorMsg(null);
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-5 right-5 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open CymbalMart Assistant chatbot"
          className="h-11 px-4 inline-flex items-center gap-2.5 bg-[#141413] hover:bg-[#2C2C2A] text-white text-sm font-medium rounded-lg shadow-lg border border-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#164E3B]"
        >
          <MessageSquare className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          <span>CymbalMart Assistant</span>
        </button>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="CymbalMart Assistant"
      className="fixed bottom-5 right-5 z-40 w-[calc(100vw-2.5rem)] sm:w-[400px] h-[540px] max-h-[82vh] bg-white border border-[#E5E5E0] rounded-xl shadow-2xl flex flex-col overflow-hidden"
    >
      <div className="px-4 py-3.5 bg-[#141413] text-white flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2
            className="text-base font-medium leading-tight truncate"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            CymbalMart Assistant
          </h2>
          <p className="text-[11px] text-white/70 truncate">
            Customer Support · Product &amp; Order Help
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            aria-label="Reset CymbalMart Assistant conversation"
            title="New conversation"
            className="w-8 h-8 flex items-center justify-center rounded-md text-white/75 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close CymbalMart Assistant"
            className="w-8 h-8 flex items-center justify-center rounded-md text-white/75 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 bg-[#FAF9F6]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#164E3B] text-white'
                  : 'bg-white border border-[#E5E5E0] text-[#141413]'
              }`}
            >
              <p className="whitespace-pre-line">{msg.text}</p>

              {msg.actions && msg.actions.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-[#E5E5E0] space-y-1">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-[#5C5C57]">
                    Bag Updated
                  </div>
                  <ul className="space-y-0.5">
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
            <span className="text-[10px] text-[#787872] mt-1 px-1">
              {msg.role === 'user' ? 'You' : 'CymbalMart Assistant'} · {msg.timestamp}
            </span>
          </div>
        ))}

        {isSending && (
          <div className="flex flex-col items-start">
            <div className="rounded-xl px-3.5 py-2.5 bg-white border border-[#E5E5E0] space-y-1.5">
              <div className="text-xs text-[#52524E]">CymbalMart Assistant is typing...</div>
              <div className="h-2 w-36 bg-[#E5E5E0] rounded animate-pulse" />
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-xs text-[#B91C1C]">
            {errorMsg}
          </div>
        )}

        <div ref={endRef} />
      </div>

      <div className="p-3 bg-white border-t border-[#E5E5E0] space-y-2.5">
        <div className="flex flex-wrap gap-1.5">
          {CUSTOMER_STARTERS.map((q) => (
            <button
              key={q}
              type="button"
              disabled={isSending}
              onClick={() => sendMessage(q)}
              className="px-2 py-1 text-[11px] font-medium text-[#52524E] bg-[#F8F8F6] border border-[#E5E5E0] hover:border-[#164E3B] hover:text-[#164E3B] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask CymbalMart Assistant..."
            aria-label="Ask CymbalMart Assistant"
            disabled={isSending}
            className="flex-1 h-9 px-3 bg-[#F8F8F6] border border-[#D8D8D2] rounded-lg text-xs text-[#141413] placeholder:text-[#787872] focus:outline-none focus:border-[#164E3B] disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={isSending || !inputText.trim()}
            aria-label="Send message to CymbalMart Assistant"
            className="h-9 px-3.5 inline-flex items-center justify-center gap-1.5 bg-[#164E3B] hover:bg-[#113D2E] disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
