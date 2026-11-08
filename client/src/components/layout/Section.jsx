import Container from './Container.jsx';

const VARIANTS = {
  base: 'bg-bg text-text',
  surface: 'bg-surface text-text',
  dark: 'bg-dark text-text-invert',
};

export default function Section({ children, variant = 'base', border = false, className = '', containerClassName = '', as: As = 'section' }) {
  const borderClass = border ? (variant === 'dark' ? 'border-t border-hairline-dark' : 'border-t border-hairline') : '';
  return (
    <As className={`${VARIANTS[variant]} py-20 sm:py-24 ${borderClass} ${className}`}>
      <Container className={containerClassName}>{children}</Container>
    </As>
  );
}
