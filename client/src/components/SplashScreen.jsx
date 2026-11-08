import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_MESSAGES = [
  'Establishing secure connection…',
  'Authenticating session…',
  'Syncing distributed inventory nodes…',
  'Reconciling dispatch records…',
  'Loading procurement dashboard…',
];

// Four satellite nodes around a central hub — the hub is this business, the
// nodes are the warehouses/dealers/depots it stays in sync with. Pure SVG +
// Framer Motion opacity/scale pulses, no external logo image: this screen's
// whole job is to cover the gap before real assets/data are ready, so it
// can't itself depend on something that hasn't loaded yet.
const NODES = [
  { x: 60, y: 14 },
  { x: 106, y: 60 },
  { x: 60, y: 106 },
  { x: 14, y: 60 },
];

/**
 * Loading mask. Render conditionally — e.g. `{isPending && <SplashScreen />}`
 * — Framer Motion's exit animation needs an <AnimatePresence> ancestor to
 * actually play on unmount, so wrap the conditional in one if you want the
 * fade-out (this app already wraps routes in AnimatePresence in App.jsx; a
 * standalone usage elsewhere needs its own).
 *
 * `fullScreen` (default true) covers the whole viewport, fixed — use this
 * for anything blocking the entire app (initial boot, full-page transitions).
 * Pass `fullScreen={false}` to fill the nearest `relative`-positioned
 * ancestor instead — for a contained loading state (e.g. a Suspense
 * boundary around one lazy-loaded section) where the header/nav around it
 * should stay visible and interactive.
 */
export default function SplashScreen({ messages = DEFAULT_MESSAGES, businessName = 'M/s Jay Prakash Ganeriwala', fullScreen = true }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % messages.length);
    }, 1800);
    return () => clearInterval(id);
  }, [messages.length]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className={`${fullScreen ? 'fixed inset-0 z-[100]' : 'absolute inset-0 z-10'} flex flex-col items-center justify-center bg-bg`}
      role="status"
      aria-live="polite"
    >
      <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
        {NODES.map((n, i) => (
          <line key={`line-${i}`} x1={60} y1={60} x2={n.x} y2={n.y} className="stroke-hairline" strokeWidth="1.5" />
        ))}
        {NODES.map((n, i) => (
          <motion.circle
            key={`node-${i}`}
            cx={n.x}
            cy={n.y}
            r={5}
            className="fill-accent"
            animate={{ opacity: [0.25, 1, 0.25], scale: [0.8, 1.15, 0.8] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
          />
        ))}
        <rect x={45} y={45} width={30} height={30} rx={3} className="fill-brand" />
        <text x={60} y={64} textAnchor="middle" className="fill-white font-mono text-[11px] font-bold">
          JPG
        </text>
      </svg>

      <div className="mt-6 text-center">
        <div className="text-[18.5px] font-bold text-text">{businessName}</div>
        <div className="mt-1 font-mono text-[12.5px] uppercase tracking-[0.14em] text-text-muted">
          HPCL Industrial Lubricants
        </div>
      </div>

      <div className="relative mt-8 h-[3px] w-[220px] overflow-hidden border border-hairline bg-surface">
        <motion.div
          className="absolute inset-y-0 w-1/3 bg-brand"
          animate={{ x: ['-100%', '320%'] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="mt-4 flex h-[18px] w-[300px] items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
            className="whitespace-nowrap font-mono text-[12.5px] text-text-muted"
          >
            {messages[index]}
          </motion.p>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
