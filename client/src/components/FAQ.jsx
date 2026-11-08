import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Reveal } from './Reveal.jsx';

export default function FAQ({ items }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <Reveal className="divide-y divide-hairline border-y border-hairline">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        const panelId = `faq-panel-${i}`;
        const buttonId = `faq-button-${i}`;
        return (
          <div key={item.q}>
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIndex(isOpen ? -1 : i)}
                className="flex w-full items-center justify-between gap-4 py-5 text-left text-[17.5px] font-semibold text-text"
              >
                {item.q}
                <ChevronDown
                  size={18}
                  className={`flex-shrink-0 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
            </h3>
            {isOpen && (
              <div id={panelId} role="region" aria-labelledby={buttonId} className="pb-5 pr-8 text-[17.5px] leading-relaxed text-text-secondary">
                {item.a}
              </div>
            )}
          </div>
        );
      })}
    </Reveal>
  );
}
