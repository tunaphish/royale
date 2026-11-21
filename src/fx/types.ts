import type * as Phaser from 'phaser';

/** How long an FX runs, in ms. `'infinite'` runs until its handle is stopped. */
export type Duration = number | 'infinite';

/** A fixed value, or a random value between `[min, max]`. */
export type Range = number | [number, number];

/** `'#rrggbb'`. */
export type Color = string;

/** A color, or a color with a weight for how often it's picked. */
export type ColorChoice = Color | { color: Color; weight: number };

/**
 * Where on the stage something is drawn, back to front. FX can't draw over the
 * React UI: it's HTML above the canvas.
 */
export type StageDepth = 'background' | 'behind' | 'characters' | 'front' | 'foreground' | 'top';

/** Depth values for each stage layer. Anything drawn on a lit stage uses these. */
export const DEPTH: Record<StageDepth, number> = {
  background: 0,
  behind: 100,
  characters: 200,
  front: 300,
  foreground: 400,
  top: 500,
};

/** Random flicker on a light's intensity, for torches and unstable magic. */
export interface Flicker {
  /** 0 is steady, 1 can drop to nothing. */
  amount: number;
  /** Flickers per second, roughly. */
  speed: number;
}

/**
 * How a particle lights its surroundings.
 * - `map`: soft colored light added to the light map. Any number is cheap; ignores normal maps.
 * - `point`: a real light that uses normal maps. There are only `POINT_SLOTS`; the brightest
 *   win and the rest fall back to `map`.
 */
export interface LightDef {
  mode: 'map' | 'point';
  /** Reach, in screen pixels. */
  radius: number;
  /** Brightness at full particle alpha. */
  strength: number;
  /** Height above the art, as a fraction of the radius. `point` only. Low is raking light. */
  height?: number;
  /** Multiplies brightness when competing for point slots. Default 1. */
  priority?: number;
  flicker?: Flicker;
}

/**
 * Where particles spawn, relative to where the FX is played.
 * - `point`: exactly there
 * - `circle`/`rect`: around it (sizes in screen pixels)
 * - `stage`: anywhere on the stage, wherever the FX is played
 */
export type Area =
  | 'point'
  | 'stage'
  | { circle: number }
  | { rect: [width: number, height: number] };

export interface ParticleLayerDef {
  kind: 'particles';
  /** `'builtin:cross'` etc. (see `fx/textures.ts`), or an image key like `'fx/leaf'`. */
  sprite: string;
  /** Default `'front'`. */
  depth?: Exclude<StageDepth, 'background' | 'characters' | 'foreground'>;
  /** Default `'point'`. */
  area?: Area;
  /** Particles per second while the FX runs. */
  rate?: number;
  /** Particles spawned at once when the FX starts. */
  burst?: number;
  /** Each particle's life, in ms. */
  lifespan: Range;
  /** Pixels per second. Negative y is up. */
  velocity?: { x?: Range; y?: Range };
  /** Pixels per second², downward. */
  gravity?: number;
  /** Scale of the sprite. Default 1. */
  size?: Range;
  /** Starting angle in degrees. */
  angle?: Range;
  /** Degrees per second. */
  spin?: Range;
  /** Default `'in-out'`. */
  fade?: 'in-out' | 'in' | 'out' | 'none';
  colors: ColorChoice[];
  /** `'add'` (default) glows; `'normal'` is for solid things like leaves. */
  blend?: 'add' | 'normal';
  /** Bloom strength on this layer, 0 for none. Turned off on low quality. */
  glow?: number;
  /** Most particles alive at once. Default 100. Scaled by quality. */
  maxAlive?: number;
  light?: LightDef;
  /** Escape hatch: raw Phaser emitter config, merged over everything above. */
  emitter?: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig;
}

/** Effects on the whole view. `time` is in ms; a vignette lasts as long as the FX. */
export type CameraLayerDef =
  | { kind: 'shake'; time: number; intensity: number }
  | { kind: 'flash'; time: number; color: Color }
  | { kind: 'vignette'; strength: number; radius: number; color?: Color };

export type LayerDef = ParticleLayerDef | CameraLayerDef;

export interface FxDef {
  /** Default duration. `play` can override it. */
  duration: Duration;
  layers: LayerDef[];
  /** Simulate this many ms before the first frame, so loops start full. `true` is 3000. */
  prewarm?: boolean | number;
  /** A sound (audio key) to play when the FX starts. */
  sfx?: string;
}

/** A light that's part of a mood, placed as a fraction of the stage (`[0.5, 0.5]` is the middle). */
export interface MoodLight {
  color: Color;
  intensity: number;
  /** Reach, in screen pixels. */
  radius: number;
  /** Height above the art, as a fraction of the radius. */
  height: number;
  at: [x: number, y: number];
  flicker?: Flicker;
}

/** The base light of a scene. `flat` (white ambient, no lights, no steps) shows art as drawn. */
export interface LightingMood {
  ambient: Color;
  lights: MoodLight[];
  /** Number of light steps. 0 is smooth. */
  bands: number;
  /** 0 is a hard edge between steps, 1 a smooth ramp. */
  bandSoftness: number;
}

/** Where to play an FX: a point, or following a game object. */
export type FxTarget = { x: number; y: number } | { follow: Phaser.GameObjects.GameObject & { x: number; y: number } };

export interface PlayOptions {
  /** Default: the middle of the stage. */
  at?: FxTarget;
  /** Overrides the FX's own duration. */
  duration?: Duration;
}

export interface StopOptions {
  /** Remove every particle now, instead of letting them finish. */
  immediate?: boolean;
}

export type FxQuality = 'high' | 'low';
