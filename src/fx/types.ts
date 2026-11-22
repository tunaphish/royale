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

/** Side-to-side drift of a particle. Each particle starts drifting left or right at random. */
export interface Sway {
  /** How far it drifts from its path, in pixels. */
  distance: number;
  /** Sways per second. */
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
  /** Size at the end of its life, as a multiple of its starting size: 0 shrinks to nothing, 2 doubles. Default 1. */
  endSize?: number;
  /** Sideways push, pixels per second². Positive is right. Random per particle when a range. */
  wind?: Range;
  /** Side-to-side drift, like embers in warm air. */
  sway?: Sway;
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

export type LayerDef = ParticleLayerDef | CameraLayerDef | LightLayerDef;

export interface FxDef {
  /** Default duration. `play` can override it. */
  duration: Duration;
  layers: LayerDef[];
  /** Simulate this many ms before the first frame, so loops start full. `true` is 3000. */
  prewarm?: boolean | number;
  /** A sound (audio key) to play when the FX starts. */
  sfx?: string;
}

/** A point on the stage as fractions of its size: `[0.5, 0.5]` is the middle, `[0.5, 1]` the bottom middle. */
export type StagePoint = [x: number, y: number];

/**
 * A light that moves. Points are fractions of the stage, measured from the
 * light's own place (where the FX plays, plus its `offset`); times are ms.
 * - `swing`: hangs from `pivot` and swings like a pendulum, `angle` degrees either
 *   side, one full swing every `period`. Pivot `[0, -0.4]` hangs it from above.
 * - `pass`: travels by `to` over `time`, fading in and out on the way, then waits
 *   `gap` and goes again. Street lights going overhead. `delay` shifts its timing.
 */
export type LightMotion =
  | { kind: 'swing'; pivot: StagePoint; angle: number; period: number }
  | { kind: 'pass'; to: StagePoint; time: number; gap?: number; delay?: number };

/** A steady light: what scene lights and FX light layers share. */
export interface PointLightDef {
  color: Color;
  intensity: number;
  /** Reach, in screen pixels. */
  radius: number;
  /** Height above the art, as a fraction of the radius. Low is raking light. */
  height: number;
  flicker?: Flicker;
}

/**
 * A steady light that's part of an FX: a fire's glow, a lamp, the moon. It sits
 * where the FX plays (following a character if the FX does), gets a point slot
 * before any particle light, fades in when the FX starts and out when it stops.
 */
export interface LightLayerDef extends PointLightDef {
  kind: 'light';
  /** From where the FX plays, as fractions of the stage. `[0, -0.2]` is a fifth of the stage higher. */
  offset?: StagePoint;
  /**
   * Sits between the background and the characters, like the moon behind someone:
   * it lights the background as usual, but on characters and anything in front of
   * them it only lights the edges that face it (a rim). If more lights want point
   * slots than there are, it may light everything like a normal light.
   */
  behind?: boolean;
  motion?: LightMotion;
  /** Light steps for this light only. Default: the mood's. */
  bands?: number;
  /** Step edge for this light only, 0 hard to 1 smooth. Default: the mood's. */
  bandSoftness?: number;
  /** Fade in when the FX starts and out when it stops, in ms. Default 500. */
  fade?: number;
}

/**
 * The darkness of a scene: the color where no light reaches, and how lighting is
 * stepped. Every light comes from FX. `flat` (white, no steps) shows art as drawn.
 */
export interface LightingMood {
  ambient: Color;
  /** Number of light steps. 0 is smooth. */
  bands: number;
  /** 0 is a hard edge between steps, 1 a smooth ramp. */
  bandSoftness: number;
}

/** Something an FX can follow. Images also have a size, for `point`. */
export type FollowTarget = Phaser.GameObjects.GameObject & {
  x: number;
  y: number;
  displayWidth?: number;
  displayHeight?: number;
  originX?: number;
  originY?: number;
};

/**
 * Where to play an FX: following a game object, or a stage point (fractions)
 * that stays put in proportion when the stage resizes.
 * When following an image, `point` picks a spot on it as fractions of its size
 * (x across, y down), e.g. `[0.5, 0.45]` for a portrait's chest. Default: the
 * object's own position (for portraits, the bottom middle).
 */
export type FxTarget =
  | { follow: FollowTarget; point?: StagePoint }
  | { stage: StagePoint };

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
