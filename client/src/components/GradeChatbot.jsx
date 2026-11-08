import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ExternalLink, RotateCcw, Send, ShieldCheck } from 'lucide-react';
import { hpclSearchLink } from '../lib/hpclCatalog.js';
import { searchGrades, CATEGORY_LABELS } from '../lib/hpclSearch.js';
import Button from './Button.jsx';

const GREETING = "Tell me what you're lubricating — the equipment, or a condition like \"fire resistant\" or \"CNG\" — and I'll pull matching HPCL grades from the catalog.";

const SUGGESTIONS = ['Oil for a hydraulic excavator', 'Grease for bearings', 'Fire resistant hydraulic fluid', 'CNG genset oil'];

function initialMessages() {
  return [{ id: 'greeting', role: 'bot', text: GREETING }];
}

// Free-text grade finder — matches your message against the static catalog
// locally (see hpclSearch.js). No LLM, no API key, no per-query cost; it's
// pattern matching dressed as a chat, not natural-language understanding —
// the greeting sets that expectation instead of overpromising it.
export default function GradeChatbot() {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState('');
  const listRef = useRef(null);
  const nextId = useRef(0);
  const inputId = useId();

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  function ask(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const results = searchGrades(trimmed, { limit: 5 });
    const userMsg = { id: `u-${nextId.current++}`, role: 'user', text: trimmed };
    const botMsg = { id: `b-${nextId.current++}`, role: 'bot', results, query: trimmed };

    setMessages((m) => [...m, userMsg, botMsg]);
    setDraft('');
  }

  function handleSubmit(e) {
    e.preventDefault();
    ask(draft);
  }

  function reset() {
    setMessages(initialMessages());
    setDraft('');
  }

  return (
    <div className="border-2 border-hairline bg-surface">
      <div className="flex items-center justify-between border-b border-hairline px-5 py-3.5">
        <span className="font-mono text-[12.5px] uppercase tracking-[0.12em] text-text-muted">Grade Finder Chat</span>
        <button onClick={reset} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-text-muted hover:text-text">
          <RotateCcw size={13} /> Reset
        </button>
      </div>

      <div ref={listRef} className="max-h-[420px] space-y-3 overflow-y-auto px-5 py-5">
        {messages.map((m) => (
          <ChatBubble key={m.id} message={m} />
        ))}
      </div>

      <div className="border-t border-hairline px-5 py-4">
        {messages.length <= 1 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                className="border border-hairline px-3 py-1.5 text-[13.5px] font-medium text-text-secondary transition-colors hover:border-brand hover:text-text"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-center gap-2.5">
          <label htmlFor={inputId} className="sr-only">
            Describe what you need lubricant for
          </label>
          <input
            id={inputId}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. gear oil for a heavy truck"
            className="field-input"
          />
          <Button type="submit" variant="primary" className="!px-4 !py-2.5">
            <Send size={15} />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}

function ChatBubble({ message }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-brand px-4 py-2.5 text-[15.5px] text-white">{message.text}</div>
      </div>
    );
  }

  const hasQuery = 'query' in message;
  const results = message.results ?? [];

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
      <div className="max-w-[90%] border border-hairline bg-bg px-4 py-3">
        {!hasQuery && <p className="text-[15.5px] leading-relaxed text-text-secondary">{message.text}</p>}

        {hasQuery && results.length === 0 && (
          <p className="text-[15.5px] leading-relaxed text-text-secondary">
            No grade name matches that — try naming the equipment (e.g. &ldquo;excavator&rdquo;, &ldquo;tractor&rdquo;) or a
            condition (e.g. &ldquo;fire resistant&rdquo;, &ldquo;CNG&rdquo;), or use the guided grade finder instead.
          </p>
        )}

        {hasQuery && results.length > 0 && (
          <>
            <p className="mb-2.5 text-[15.5px] text-text-secondary">
              {results.length === 1 ? 'Closest match:' : `${results.length} grades match — closest first:`}
            </p>
            <div className="space-y-2">
              {results.map((grade, i) => (
                <ResultRow key={grade.name} grade={grade} isTop={i === 0} />
              ))}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

function ResultRow({ grade, isTop }) {
  const categoryLabels = grade.categories.map((id) => CATEGORY_LABELS[id]).filter(Boolean);

  return (
    <div className={`border p-3 ${isTop ? 'border-brand' : 'border-hairline'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[15.5px] font-semibold text-text">{grade.name}</span>
          {grade.defence && <ShieldCheck size={12} className="flex-shrink-0 text-text-muted" aria-label="Defence spec" />}
        </div>
        <a href={hpclSearchLink(grade.name)} target="_blank" rel="noreferrer" className="flex-shrink-0 text-accent hover:text-text" aria-label={`HPCL reference for ${grade.name}`}>
          <ExternalLink size={13} />
        </a>
      </div>
      <div className="mt-1 text-[13px] text-text-muted">{grade.group}{categoryLabels.length > 0 ? ` · ${categoryLabels.join(', ')}` : ''}</div>
      <Link
        to={`/contact?type=order-stock&product=${encodeURIComponent(grade.name)}`}
        className="mt-2 inline-block text-[13px] font-semibold text-brand hover:underline"
      >
        Confirm stock &amp; get quote →
      </Link>
    </div>
  );
}
