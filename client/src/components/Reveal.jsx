import { motion } from 'framer-motion';
import { revealItem, staggerContainer } from '../lib/motion.js';

export function Reveal({ children, className = '', delay = 0 }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      variants={revealItem}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

export function RevealGroup({ children, className = '', stagger = 0.1 }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      variants={staggerContainer(stagger)}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className = '' }) {
  return (
    <motion.div className={className} variants={revealItem}>
      {children}
    </motion.div>
  );
}
