import * as React from 'react';
import classNames from './battle.module.css';
import { motion } from 'framer-motion';

const expandFromCenterTransition = {
  initial: {
    scaleX: 0,
    transformOrigin: "center",
  },
  animate: (delay: number) => ({
    scaleX: 1,
    transition: {
      delay,
      duration: 0.15,
      ease: "easeOut",
    },
  }),
  exit: {
    scaleX: 0,
    transition: {
      duration: 0.15,
      ease: "easeIn",
    },
  },
};

type WindowProps = {
  children: React.ReactNode;
  style?: React.CSSProperties;
  delay?: number;
  onClick?: () => void;
};

export const Window = ({ children, style, delay = 0, onClick }: WindowProps): JSX.Element => (
  <motion.div 
    variants={expandFromCenterTransition}
    initial="initial"
    animate="animate"
    exit="exit"
    custom={delay}
    className={classNames.window}
    style={style}
    onClick={onClick}
  >
    {children}
  </motion.div>
);