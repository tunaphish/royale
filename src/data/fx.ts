import type { FxDef } from '../fx/types';

/**
 * FX definitions, keyed by ID. Play with `this.fx.play(id, { at, duration })`.
 * See `src/fx/types.ts` for every field. Tune them in the FX lab.
 */
export const FX: Record<string, FxDef> = {
  /** Green and gold sparkles drifting up over the whole stage. */
  'green-motes': {
    duration: 'infinite',
    prewarm: true,
    layers: [
      {
        kind: 'particles',
        sprite: 'builtin:cross',
        area: 'stage',
        rate: 10,
        lifespan: [2500, 4500],
        velocity: { x: [-10, 10], y: [-40, -12] },
        size: [0.6, 1.2],
        colors: [{ color: '#5dff7a', weight: 3 }, { color: '#ffc95a', weight: 1 }],
        glow: 0.6,
        maxAlive: 60,
        light: { mode: 'map', radius: 70, strength: 0.35 },
      },
      {
        kind: 'particles',
        sprite: 'builtin:orb',
        area: 'stage',
        rate: 0.6,
        lifespan: [4000, 6000],
        velocity: { x: [-6, 6], y: [-18, -6] },
        size: [1.2, 1.8],
        colors: ['#7dffa0'],
        glow: 0.8,
        maxAlive: 4,
        light: { mode: 'point', radius: 240, strength: 1.4, height: 0.15, flicker: { amount: 0.2, speed: 2 } },
      },
    ],
  },

  /** A quick upward burst of light, e.g. healing. */
  'heal-burst': {
    duration: 600,
    layers: [
      {
        kind: 'particles',
        sprite: 'builtin:square',
        area: { circle: 30 },
        burst: 30,
        lifespan: [500, 900],
        velocity: { x: [-60, 60], y: [-160, -60] },
        gravity: 120,
        size: [0.8, 1.4],
        colors: ['#9dffb0', '#ffffff'],
        fade: 'out',
        glow: 0.7,
        light: { mode: 'map', radius: 110, strength: 1 },
      },
      {
        kind: 'particles',
        sprite: 'builtin:orb',
        burst: 1,
        lifespan: 700,
        size: 1.2,
        colors: ['#b8ffc8'],
        fade: 'out',
        light: { mode: 'point', radius: 300, strength: 2, height: 0.2, priority: 2 },
      },
    ],
  },

  /** Screen hit: a short shake and white flash. */
  impact: {
    duration: 300,
    layers: [
      { kind: 'shake', time: 200, intensity: 0.01 },
      { kind: 'flash', time: 150, color: '#ffffff' },
    ],
  },
};
