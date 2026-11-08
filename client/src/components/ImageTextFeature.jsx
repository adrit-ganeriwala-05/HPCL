import ImagePlaceholder from './ImagePlaceholder.jsx';
import { Reveal } from './Reveal.jsx';

// Alternating image/text row used to break up repetitive text-only sections
// on the Capabilities page. `reverse` flips image to the right on desktop.
export default function ImageTextFeature({ code, title, what, why, how, image, reverse = false }) {
  const imageBlock = (
    <Reveal>
      <ImagePlaceholder file={image.file} alt={image.alt} ratio="aspect-[4/3]" />
    </Reveal>
  );
  const textBlock = (
    <Reveal delay={0.06}>
      <div className="font-mono text-[13px] font-bold text-accent">{code}</div>
      <h3 className="mt-2 text-[22px] font-bold leading-snug tracking-tight text-text">{title}</h3>
      <dl className="mt-4 space-y-3">
        <div>
          <dt className="font-mono text-[12.5px] uppercase tracking-wider text-text-muted">What Happens</dt>
          <dd className="mt-1 text-[17.5px] leading-relaxed text-text-secondary">{what}</dd>
        </div>
        <div>
          <dt className="font-mono text-[12.5px] uppercase tracking-wider text-text-muted">Why It Matters</dt>
          <dd className="mt-1 text-[17.5px] leading-relaxed text-text-secondary">{why}</dd>
        </div>
        <div>
          <dt className="font-mono text-[12.5px] uppercase tracking-wider text-text-muted">How It Helps You</dt>
          <dd className="mt-1 text-[17.5px] leading-relaxed text-text-secondary">{how}</dd>
        </div>
      </dl>
    </Reveal>
  );

  return (
    <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
      {reverse ? (
        <>
          <div className="lg:order-2">{imageBlock}</div>
          <div className="lg:order-1">{textBlock}</div>
        </>
      ) : (
        <>
          {imageBlock}
          {textBlock}
        </>
      )}
    </div>
  );
}
