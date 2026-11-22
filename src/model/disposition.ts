import { clamp } from './math';

/** A student's disposition toward the player runs from -10 (hostile) to 10 (close). */
export const DISPOSITION_MIN = -10;
export const DISPOSITION_MAX = 10;

export const clampDisposition = (value: number): number =>
  clamp(DISPOSITION_MIN, value, DISPOSITION_MAX);

/** What a disposition means to the game, from worst to best. */
export const DISPOSITION_BANDS = ['hostile', 'cold', 'neutral', 'warm', 'close'] as const;
export type DispositionBand = (typeof DISPOSITION_BANDS)[number];

/** The highest disposition in each band but the last. */
const BAND_TOPS: Record<Exclude<DispositionBand, 'close'>, number> = {
  hostile: -6,
  cold: -2,
  neutral: 1,
  warm: 5,
};

export const dispositionBand = (value: number): DispositionBand => {
  if (value <= BAND_TOPS.hostile) return 'hostile';
  if (value <= BAND_TOPS.cold) return 'cold';
  if (value <= BAND_TOPS.neutral) return 'neutral';
  if (value <= BAND_TOPS.warm) return 'warm';
  return 'close';
};
