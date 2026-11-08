import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const base =
  'inline-flex items-center justify-center gap-2 rounded-sm px-6 py-3 text-[18.5px] font-semibold tracking-tight transition-colors';

const VARIANTS = {
  // solid brand blue — the one high-emphasis action per view
  primary: `${base} bg-brand text-white hover:bg-brand-dark`,
  // bordered, neutral — default secondary action on light backgrounds
  outline: `${base} border-2 border-hairline text-text hover:border-brand hover:text-brand`,
  // for use on the dark hero / dark CTA sections
  onDark: `${base} border border-white/30 text-white hover:border-white hover:bg-white/[0.06]`,
  // solid white on a colored/dark background
  onColor: `${base} bg-white text-brand hover:bg-white/90`,
};

const MotionLink = motion(Link);

export default function Button({ to, href, variant = 'primary', className = '', children, ...props }) {
  const classes = `${VARIANTS[variant] ?? VARIANTS.primary} ${className}`;
  // Restrained micro-interaction: a 1px press, nothing bouncy — matches the
  // "simple interactions" rule, not a spring-heavy SaaS button.
  const motionProps = { whileTap: { y: 1 }, transition: { duration: 0.12 } };

  if (to) {
    return (
      <MotionLink to={to} className={classes} {...motionProps} {...props}>
        {children}
      </MotionLink>
    );
  }
  if (href) {
    return (
      <motion.a href={href} className={classes} {...motionProps} {...props}>
        {children}
      </motion.a>
    );
  }
  return (
    <motion.button className={classes} {...motionProps} {...props}>
      {children}
    </motion.button>
  );
}
