import { Reveal } from '../Reveal.jsx';

export default function SectionHeading({ kicker, title, description, dark = false, align = 'left', level = 'h2', className = '' }) {
  const alignClass = align === 'center' ? 'mx-auto text-center' : '';
  const Heading = level;
  return (
    <Reveal className={`mb-14 max-w-[640px] ${alignClass} ${className}`}>
      {kicker && (
        <div className="font-mono text-[12.5px] font-medium uppercase tracking-[0.14em] text-accent">
          {kicker}
        </div>
      )}
      <Heading className={`mt-3 text-[30px] font-bold leading-[1.15] tracking-tight sm:text-[34px] ${dark ? 'text-text-invert' : 'text-text'}`}>
        {title}
      </Heading>
      {description && (
        <p className={`mt-4 text-[18.5px] leading-relaxed ${dark ? 'text-text-invert-muted' : 'text-text-secondary'}`}>
          {description}
        </p>
      )}
    </Reveal>
  );
}
