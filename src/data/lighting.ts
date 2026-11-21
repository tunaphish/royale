import type { LightingMood } from '../fx/types';

/**
 * Lighting moods: the base light of a scene, keyed by ID. Set with
 * `this.fx.setMood(id, { fade })`. Light positions are fractions of the stage.
 *
 * `flat` shows art exactly as drawn and is every scene's default, so nothing
 * changes until a scene or story asks for lighting.
 */
export const LIGHTING: Record<string, LightingMood> = {
  flat: { ambient: '#ffffff', lights: [], bands: 0, bandSoftness: 0 },
  ember: {
    ambient: '#3a1418',
    bands: 3,
    bandSoftness: 0,
    lights: [{ color: '#ffc890', intensity: 1.6, radius: 650, height: 0.2, at: [0.5, 0.33] }],
  },
  soft: {
    ambient: '#5a5868',
    bands: 3,
    bandSoftness: 0.15,
    lights: [{ color: '#ffe9cc', intensity: 1, radius: 420, height: 0.25, at: [0.5, 0.33] }],
  },
  candle: {
    ambient: '#2a1e1e',
    bands: 2,
    bandSoftness: 0,
    lights: [{
      color: '#ffb36b', intensity: 1.4, radius: 300, height: 0.08, at: [0.5, 0.33],
      flicker: { amount: 0.25, speed: 3 },
    }],
  },
  moonlight: {
    ambient: '#232a40',
    bands: 3,
    bandSoftness: 0.05,
    lights: [
      { color: '#b9ccff', intensity: 0.9, radius: 460, height: 0.3, at: [0.5, 0.33] },
      { color: '#6f8cff', intensity: 0.9, radius: 380, height: 0.1, at: [0.85, 0.2] },
    ],
  },
  neon: {
    ambient: '#2a1f36',
    bands: 2,
    bandSoftness: 0,
    lights: [
      { color: '#ff6ad5', intensity: 1.1, radius: 380, height: 0.12, at: [0.5, 0.33] },
      { color: '#3ef0ff', intensity: 1.2, radius: 400, height: 0.08, at: [0.85, 0.2] },
    ],
  },
  /** Near-dark, for scenes lit mostly by FX. */
  night: { ambient: '#1a1420', lights: [], bands: 3, bandSoftness: 0 },
};
