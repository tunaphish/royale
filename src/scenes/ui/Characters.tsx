import React from 'react';
import { motion, useMotionValue } from 'framer-motion';
import classNames from './ui.module.css';


export type TextEffectType = 'limit' | 'frenzy' | 'normal';

// Marker components - they just render children, the typewriter extracts the effect type
interface EffectProps {
  children: React.ReactNode;
}

export const Limit = ({ children }: EffectProps) => children;
(Limit as any).effectType = 'limit';

export const Frenzy = ({ children }: EffectProps) => children;
(Frenzy as any).effectType = 'frenzy';

// Helper to check if a component is an effect wrapper
export const getEffectType = (component: any): TextEffectType | null => {
  return component?.effectType ?? null;
};

interface CharProps {
  char: string;
  offset?: number;
}

const LimitBreakChar = ({ char, offset = 0 }: CharProps) => (
  <span
    className={classNames.limitBreakLetter}
    style={{
      animationDelay: `${-(offset * 40)}ms`,
    }}
  >
    {char}
  </span>
);

const FrenzyChar = ({ char, intensity = 4 }: CharProps & { intensity?: number }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      x.set((Math.random() - 0.5) * intensity);
      y.set((Math.random() - 0.5) * intensity);
    }, 50);

    return () => clearInterval(interval);
  }, [intensity, x, y]);

  return (
    <motion.span
      style={{
        display: 'inline-block',
        x,
        y,
      }}
    >
      {char}
    </motion.span>
  );
};

export const renderChar = (
  char: string,
  effect: TextEffectType,
  offset?: number
): React.ReactNode => {
  if (char === ' ') return '\u00A0';
  switch (effect) {
    case 'limit':
      return <LimitBreakChar key={`${offset}-${char}`} char={char} offset={offset} />;
    case 'frenzy':
      return <FrenzyChar key={`${offset}-${char}`} char={char} />;
    case 'normal':
    default:
      return char;
  }
};