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
  /**
   * Night by a campfire: the moon behind the character rims them in blue and
   * lights the background; the fire at the bottom of the stage lights their front.
   * Brings the `campfire` FX (flames, embers, smoke).
   */
  campfire: {
    ambient: '#1b2036',
    bands: 3,
    bandSoftness: 0.05,
    lights: [
      {
        color: '#ff9442', intensity: 1.7, radius: 560, height: 0.12, at: [0.5, 1],
        flicker: { amount: 0.3, speed: 2.5 },
      },
      { color: '#7f9fff', intensity: 1.3, radius: 750, height: 0.35, at: [0.78, 0.1], behind: true },
    ],
    fx: [{ id: 'campfire', at: [0.5, 0.97] }],
  },
  /** A lamp swinging overhead. */
  'lamp-swing': {
    ambient: '#1e1a1e',
    bands: 3,
    bandSoftness: 0,
    lights: [{
      color: '#ffd7a0', intensity: 1.5, radius: 480, height: 0.3, at: [0.5, 0.2],
      motion: { kind: 'swing', pivot: [0.5, -0.25], angle: 28, period: 3200 },
    }],
  },
  /** Passenger seat at night: street lights pass overhead, the dashboard glows below. */
  'night-drive': {
    ambient: '#141826',
    bands: 3,
    bandSoftness: 0.05,
    lights: [
      {
        color: '#ffb35c', intensity: 1.8, radius: 520, height: 0.35, at: [0.15, -0.15],
        motion: { kind: 'pass', to: [0.85, 0.7], time: 1100, gap: 1400 },
      },
      { color: '#4fd7ff', intensity: 0.7, radius: 360, height: 0.1, at: [0.5, 1.05] },
    ],
  },
  /** Near-dark, for scenes lit mostly by FX. */
  night: { ambient: '#1a1420', lights: [], bands: 3, bandSoftness: 0 },
};
