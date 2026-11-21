import * as React from 'react';
import styles from './fxlab.module.css';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

export const Slider = ({ label, value, min, max, step, onChange }: SliderProps) => (
  <label className={styles.row}>
    <span>{label}</span>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value))} />
    <span className={styles.value}>{Math.round(value * 1000) / 1000}</span>
  </label>
);

export const ColorRow = ({ label, value, onChange, extra }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  extra?: React.ReactNode;
}) => (
  <label className={styles.row}>
    <span>{label}</span>
    <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
    <span>{extra}</span>
  </label>
);

/** A button that shows whether it's selected. Used for every on/off and pick-one control. */
export const Toggle = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button className={on ? styles.on : styles.off} aria-pressed={on} onClick={onClick}>
    {children}
  </button>
);

/** A small inline button: add, remove, convert. */
export const Small = ({ onClick, children, title }: { onClick: () => void; children: React.ReactNode; title?: string }) => (
  <button className={styles.small} onClick={onClick} title={title}>{children}</button>
);
