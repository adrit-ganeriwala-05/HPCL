import { ImageOff } from 'lucide-react';

// Stands in for real business photography that doesn't exist yet. Shows the
// exact filename + description a photographer/admin needs to produce —
// deliberately visible as a placeholder rather than silently substituting
// an unrelated stock photo. Swap for a real <img> once the asset exists;
// `alt` is already written and ready to carry over.
export default function ImagePlaceholder({ file, alt, ratio = 'aspect-[4/3]', dark = false, className = '' }) {
  return (
    <div
      role="img"
      aria-label={alt}
      className={`flex ${ratio} flex-col items-center justify-center gap-2.5 border ${
        dark ? 'border-hairline-dark bg-dark-surface' : 'border-hairline bg-surface'
      } px-6 text-center ${className}`}
    >
      <ImageOff size={22} className={dark ? 'text-text-invert-muted' : 'text-text-muted'} strokeWidth={1.5} />
      <div className={`font-mono text-[13.5px] ${dark ? 'text-text-invert-muted' : 'text-text-muted'}`}>{file}</div>
      <div className={`max-w-[220px] text-[17.5px] leading-snug ${dark ? 'text-text-invert-muted' : 'text-text-muted'}`}>
        {alt}
      </div>
    </div>
  );
}
