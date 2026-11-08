export const pageVariants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 0.9, 0.3, 1] } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.3, ease: [0.22, 0.9, 0.3, 1] } },
};

export const staggerContainer = (stagger = 0.1, delayChildren = 0) => ({
  hidden: {},
  show: {
    transition: { staggerChildren: stagger, delayChildren },
  },
});

export const revealItem = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 0.9, 0.3, 1] } },
};
