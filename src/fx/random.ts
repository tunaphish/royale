import type { Color, ColorChoice, Range } from './types';

/** A value from a `Range`: fixed, or random between min and max. */
export const pick = (range: Range): number =>
  typeof range === 'number' ? range : range[0] + Math.random() * (range[1] - range[0]);

/** A color from a weighted list. */
export const pickColor = (choices: ColorChoice[]): Color => {
  let total = 0;
  for (const choice of choices) total += typeof choice === 'string' ? 1 : choice.weight;
  let roll = Math.random() * total;
  for (const choice of choices) {
    roll -= typeof choice === 'string' ? 1 : choice.weight;
    if (roll <= 0) return typeof choice === 'string' ? choice : choice.color;
  }
  const last = choices[choices.length - 1];
  return typeof last === 'string' ? last : last.color;
};

export const isColor = (value: string): boolean => /^#[0-9a-fA-F]{6}$/.test(value);

/** `'#rrggbb'` → `0xrrggbb`. */
export const colorInt = (color: Color): number => parseInt(color.slice(1), 16);

/** `0xrrggbb` → 0-1 channels, written into `out` so nothing is allocated per frame. */
export const channels = (color: number, out: { r: number; g: number; b: number }): void => {
  out.r = ((color >> 16) & 0xff) / 255;
  out.g = ((color >> 8) & 0xff) / 255;
  out.b = (color & 0xff) / 255;
};
