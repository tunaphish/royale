import type { FxDef } from '../fx/types';

/**
 * FX definitions, keyed by ID. Play with `this.fx.play(id, { at, duration })`.
 * See `src/fx/types.ts` for every field. Tune them in the FX lab.
 *
 * Every light in the game is an FX: a `light` layer is a steady light at the
 * FX's position (plus its `offset`). Light-only FX below are placed so they look
 * right played without `at`, i.e. from the middle of the stage.
 */
export const FX: Record<string, FxDef> = {
  /** A soft, warm key light on the character's face. */
  'soft-light': {
    duration: 'infinite',
    layers: [{ kind: 'light', color: '#ffe9cc', intensity: 1, radius: 420, height: 0.25, offset: [0, -0.17] }],
  },

  /** A strong warm light on the character's face, like a fire just off stage. */
  'warm-light': {
    duration: 'infinite',
    layers: [{ kind: 'light', color: '#ffc890', intensity: 1.6, radius: 650, height: 0.2, offset: [0, -0.17] }],
  },

  /** A small flickering candle close to the character's face. */
  candlelight: {
    duration: 'infinite',
    layers: [{
      kind: 'light', color: '#ffb36b', intensity: 1.4, radius: 300, height: 0.08, offset: [0, -0.17],
      flicker: { amount: 0.25, speed: 3 },
    }],
  },

  /** Moonlight from the front, with a deeper blue from the upper right. */
  moonlight: {
    duration: 'infinite',
    layers: [
      { kind: 'light', color: '#b9ccff', intensity: 0.9, radius: 460, height: 0.3, offset: [0, -0.17] },
      { kind: 'light', color: '#6f8cff', intensity: 0.9, radius: 380, height: 0.1, offset: [0.35, -0.3] },
    ],
  },

  /** The moon behind the character: lights the background and outlines them in blue. */
  'moon-behind': {
    duration: 'infinite',
    layers: [{ kind: 'light', color: '#7f9fff', intensity: 1.3, radius: 750, height: 0.35, offset: [0.28, -0.4], behind: true }],
  },

  /** Pink and cyan signs, one in front, one to the upper right. */
  'neon-signs': {
    duration: 'infinite',
    layers: [
      { kind: 'light', color: '#ff6ad5', intensity: 1.1, radius: 380, height: 0.12, offset: [0, -0.17] },
      { kind: 'light', color: '#3ef0ff', intensity: 1.2, radius: 400, height: 0.08, offset: [0.35, -0.3] },
    ],
  },

  /** A lamp swinging overhead. */
  'hanging-lamp': {
    duration: 'infinite',
    layers: [{
      kind: 'light', color: '#ffd7a0', intensity: 1.5, radius: 480, height: 0.3, offset: [0, -0.3],
      motion: { kind: 'swing', pivot: [0, -0.45], angle: 28, period: 3200 },
    }],
  },

  /** Passenger seat at night: street lights passing overhead, again and again. */
  'street-lights': {
    duration: 'infinite',
    layers: [{
      kind: 'light', color: '#ffb35c', intensity: 1.8, radius: 520, height: 0.35, offset: [-0.35, -0.65],
      motion: { kind: 'pass', to: [0.7, 0.85], time: 1100, gap: 1400 },
    }],
  },

  /** A cool glow from below the stage, like a car's dashboard. */
  'dashboard-glow': {
    duration: 'infinite',
    layers: [{ kind: 'light', color: '#4fd7ff', intensity: 0.7, radius: 360, height: 0.1, offset: [0, 0.55] }],
  },

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

  /**
   * A campfire, made to play at the bottom of the stage (`at bottom`): its glow
   * on the character, flames, embers drifting up past them, and smoke behind.
   */
  campfire: {
    duration: 'infinite',
    prewarm: 2500,
    layers: [
      {
        kind: 'light', color: '#ff9442', intensity: 1.7, radius: 560, height: 0.12, offset: [0, 0.05],
        flicker: { amount: 0.3, speed: 2.5 }, fade: 1500,
      },
      {
        kind: 'particles',
        sprite: 'builtin:orb',
        depth: 'behind',
        area: { rect: [70, 10] },
        rate: 1.5,
        lifespan: [3000, 5000],
        velocity: { x: [-6, 6], y: [-45, -25] },
        sway: { distance: 14, speed: 0.25 },
        wind: [0, 6],
        size: [2, 3],
        endSize: 2.2,
        fade: 'in-out',
        blend: 'normal',
        colors: ['#262833', '#1d1f29'],
        maxAlive: 14,
      },
      {
        kind: 'particles',
        sprite: 'builtin:orb',
        depth: 'front',
        area: { rect: [50, 6] },
        rate: 30,
        lifespan: [350, 700],
        velocity: { x: [-8, 8], y: [-130, -80] },
        size: [0.8, 1.3],
        endSize: 0.1,
        fade: 'none',
        blend: 'normal',
        colors: [{ color: '#ff9a2e', weight: 3 }, { color: '#ff5a1a', weight: 2 }, '#ffe58a'],
        glow: 0.35,
        maxAlive: 30,
        light: { mode: 'map', radius: 60, strength: 0.1, flicker: { amount: 0.3, speed: 5 } },
      },
      {
        kind: 'particles',
        sprite: 'builtin:square',
        depth: 'top',
        area: { rect: [90, 12] },
        rate: 7,
        lifespan: [2200, 4200],
        velocity: { x: [-10, 10], y: [-95, -45] },
        sway: { distance: 10, speed: 0.7 },
        wind: [-4, 10],
        size: [0.7, 1.1],
        endSize: 0.5,
        fade: 'out',
        colors: [{ color: '#ffb347', weight: 3 }, { color: '#ff6a1f', weight: 2 }, '#fff1b0'],
        glow: 0.6,
        maxAlive: 40,
        light: { mode: 'map', radius: 28, strength: 0.4 },
      },
    ],
  },
};
