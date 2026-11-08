const SOURCES = {
  horizontal: '/images/brand/hpcl/hpcl-horizontal-lockup.svg',
  vertical: '/images/brand/hpcl/hpcl-vertical-lockup.svg',
  emblem: '/images/brand/hpcl/hpcl-emblem.svg',
};

// Single place enforcing the brand-asset rules: never stretched (object-
// contain), never recolored, never redundant alt text when the same
// identity already appears in visible text beside it.
//
// No default h-/w- classes here: Tailwind emits `.h-auto`/`.w-auto` after
// the fixed-size utilities in its generated stylesheet, so a hardcoded
// `h-auto w-auto` base class would always beat a caller's `h-7 w-7` in the
// cascade regardless of prop order, silently ignoring every size override.
// Every caller must pass an explicit size in `className`.
export default function HpclMark({ variant = 'emblem', alt = 'Hindustan Petroleum Corporation Limited', decorative = false, className = '' }) {
  return (
    <img
      src={SOURCES[variant]}
      alt={decorative ? '' : alt}
      className={`object-contain ${className}`}
      loading="lazy"
    />
  );
}
