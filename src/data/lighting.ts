import type { LightingMood } from '../fx/types';

/**
 * Moods: the darkness of a scene, keyed by ID. A mood is the color where no
 * light reaches and how lighting is stepped; it has no lights of its own. Every
 * light (a fire, the moon, a lamp, a spell) is an FX in `data/fx.ts`.
 *
 * Set with `#light <mood> [fade ms]` in ink, or `this.fx.setMood(id, { fade })`.
 * `flat` shows art exactly as drawn and is every scene's default.
 */
export const LIGHTING: Record<string, LightingMood> = {
  flat: { ambient: '#ffffff', bands: 0, bandSoftness: 0 },
  /** A dim room, an overcast day: everything readable, nothing bright. */
  dim: { ambient: '#5a5868', bands: 3, bandSoftness: 0.15 },
  /** Indoors at night, lit by fire or candles: warm, deep shadows. */
  firelit: { ambient: '#321a1c', bands: 3, bandSoftness: 0 },
  /** Outdoors at night: cool blue. Add the moon, a campfire, street lights. */
  night: { ambient: '#1c2238', bands: 3, bandSoftness: 0.05 },
  /** Almost black: for scenes lit only by FX (a lamp, a spell, a single fire). */
  'pitch-dark': { ambient: '#1b161f', bands: 3, bandSoftness: 0 },
  /** A purple city night under signs and screens. */
  'city-night': { ambient: '#2a1f36', bands: 2, bandSoftness: 0 },
};
