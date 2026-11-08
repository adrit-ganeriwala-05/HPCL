import { CheckCircle2 } from 'lucide-react';
import { TRUST_POINTS } from '../lib/content.js';

function Point({ point }) {
  return (
    <span className="inline-flex flex-shrink-0 items-center gap-2 px-4 text-[15px] font-medium text-text-secondary">
      <CheckCircle2 size={14} className="flex-shrink-0 text-brand" />
      {point}
    </span>
  );
}

// Continuous horizontal marquee — the row is repeated 3x back-to-back and
// slides exactly one copy-width (see the -33.3333% keyframe in
// tailwind.config.js), so the loop point is invisible. Three copies rather
// than two so a repeat is never visible on-screen next to the original,
// even on an ultrawide viewport. The two repeats are aria-hidden so screen
// readers only hear the list once; edge fade keeps text from clipping
// abruptly at the container bounds.
export default function TrustStrip() {
  return (
    <div className="overflow-hidden border-b border-hairline bg-surface py-4 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
        <div className="flex flex-shrink-0 items-center" role="list" aria-label="Trust points">
          {TRUST_POINTS.map((point) => (
            <Point key={point} point={point} />
          ))}
        </div>
        {[0, 1].map((copy) => (
          <div key={copy} className="flex flex-shrink-0 items-center" aria-hidden="true">
            {TRUST_POINTS.map((point) => (
              <Point key={point} point={point} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
