import React from 'react';
import { motion, useMotionValue } from 'framer-motion';
import classNames from './ui.module.css';

interface EffectProps {
  children: React.ReactNode;
}

export const Frenzy = ({ children }: EffectProps): JSX.Element => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      x.set((Math.random() - 0.5) * 4);
      y.set((Math.random() - 0.5) * 4);
    }, 50);

    return () => clearInterval(interval);
  }, [x, y]);

  return (
    <motion.span
      style={{
        display: 'inline-block',
        x,
        y,
      }}
    >
      {children}
    </motion.span>
  );
};