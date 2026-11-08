import { MapPin } from 'lucide-react';
import HpclMark from './HpclMark.jsx';

const YEAR = new Date().getFullYear();

// Phone/email are already the CTA directly above the footer
// (DealerEnquiryCTA) on every page — repeating them here was redundant.
// Nav links are already the navbar — this isn't a second navigation surface,
// just brand identity, the one thing the CTA above doesn't carry, and the
// legal/copyright lines.
export default function Footer() {
  return (
    <footer className="border-t border-hairline-dark bg-dark text-text-invert-muted">
      <div className="mx-auto max-w-container px-7 py-12">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-sm border-2 border-white/30 font-mono text-[11px] font-bold text-white">
                JPG
              </div>
              <span className="text-[18.5px] font-bold text-white">M/s Jay Prakash Ganeriwala</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <HpclMark variant="emblem" className="h-4 w-4" decorative />
              <span className="font-mono text-[12.5px] uppercase tracking-[0.1em] text-text-invert-muted">
                C&amp;F Agent for HPCL Lubricants
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[17.5px]">
            <span className="flex items-center gap-2">
              <MapPin size={13} className="flex-shrink-0" /> Raniganj, Paschim Bardhaman, West Bengal
            </span>
            <span className="font-mono text-[15px] text-text-invert-muted/70">Mon–Sat 9:00–19:00</span>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-6">
          <p className="text-[16px] leading-relaxed text-text-invert-muted/60">
            The HPCL name and logo are registered trademarks of Hindustan Petroleum Corporation
            Limited. This website belongs to M/s Jay Prakash Ganeriwala, an independent
            Consignment &amp; Forwarding business operating in HPCL industrial lubricants — it is not
            the official HPCL website and is not operated by Hindustan Petroleum Corporation Limited.
          </p>
        </div>

        <div className="mt-5 border-t border-white/10 pt-5 text-[16px] text-text-invert-muted/70">
          © {YEAR} M/s Jay Prakash Ganeriwala. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
