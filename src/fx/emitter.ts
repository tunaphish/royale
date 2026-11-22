import * as Phaser from 'phaser';
import { colorInt, pick, pickColor } from './random';
import type { Area, ParticleLayerDef, Range } from './types';

/** Extra per-particle values the FX system needs. Stored on Phaser's particle object. */
export interface FxParticle extends Phaser.GameObjects.Particles.Particle {
  fxSeed: number;
  fxAngle: number;
  fxSpin: number;
  /** Starting scale, for `endSize`. */
  fxSize: number;
  /** Sideways push, for `wind`. */
  fxWind: number;
  /** -1 or 1: which way `sway` starts. */
  fxSwayDir: number;
}

const toOp = (range: Range) => (typeof range === 'number' ? range : { min: range[0], max: range[1] });

const FADES: Record<NonNullable<ParticleLayerDef['fade']>, (t: number) => number> = {
  'in-out': (t) => Math.sin(Math.PI * t),
  in: (t) => Math.min(t * 4, 1),
  out: (t) => 1 - t,
  none: () => 1,
};

function emitZone(area: Area, origin: { x: number; y: number }, stage: { width: number; height: number }) {
  let source: Phaser.Geom.Rectangle | Phaser.Geom.Circle | undefined;
  if (area === 'stage') source = new Phaser.Geom.Rectangle(-origin.x, -origin.y, stage.width, stage.height);
  else if (area === 'point') source = undefined;
  else if ('circle' in area) source = new Phaser.Geom.Circle(0, 0, area.circle);
  else source = new Phaser.Geom.Rectangle(-area.rect[0] / 2, -area.rect[1] / 2, area.rect[0], area.rect[1]);
  // Phaser's geometry types don't line up with its zone source type, though they work at runtime.
  return source && ({ type: 'random', source } as unknown as Phaser.Types.GameObjects.Particles.EmitZoneData);
}

/** Scale, shrinking or growing to `endSize` over the particle's life. */
function sizeOps(layer: ParticleLayerDef): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
  const size = layer.size ?? 1;
  const end = layer.endSize ?? 1;
  if (end === 1) return { scale: toOp(size) };
  return {
    // Only `scale` is set, so Phaser copies scaleX into scaleY.
    scale: {
      onEmit: (p?: Phaser.GameObjects.Particles.Particle) => {
        const particle = p as FxParticle;
        particle.fxSize = pick(size);
        return particle.fxSize;
      },
      onUpdate: (p: Phaser.GameObjects.Particles.Particle, _k: string, t: number) =>
        (p as FxParticle).fxSize * (1 + (end - 1) * t),
    },
  };
}

/**
 * Wind and sway, as sideways acceleration. Sway accelerates as ∓D·ω²·cos(ωt)
 * from rest, so velocity is ∓D·ω·sin(ωt) and the particle drifts up to 2·D to
 * one side and back, never off its path for good.
 */
function windOps(layer: ParticleLayerDef): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
  const { wind, sway } = layer;
  if (wind === undefined && !sway) return {};
  const omega = sway ? sway.speed * Math.PI * 2 : 0;
  const swayAccel = sway ? sway.distance * omega * omega : 0;
  return {
    accelerationX: {
      onEmit: (p?: Phaser.GameObjects.Particles.Particle) => {
        const particle = p as FxParticle;
        particle.fxWind = pick(wind ?? 0);
        particle.fxSwayDir = Math.random() < 0.5 ? -1 : 1;
        return particle.fxWind;
      },
      onUpdate: (p: Phaser.GameObjects.Particles.Particle, _k: string, t: number) => {
        const particle = p as FxParticle;
        if (!sway) return particle.fxWind;
        const seconds = (t * particle.life) / 1000;
        return particle.fxWind - swayAccel * particle.fxSwayDir * Math.cos(omega * seconds);
      },
    },
  };
}

export interface EmitterContext {
  /** Where the emitter sits. `stage` areas are measured from here so they always cover the stage. */
  origin: { x: number; y: number };
  stage: { width: number; height: number };
  /** Particle multiplier from the quality setting (1 is full). */
  particleScale: number;
}

/**
 * Turns one of our particle layers into Phaser emitter config. Our format is
 * kept small on purpose; anything else goes through `layer.emitter`.
 * The emitter starts stopped: `FxHandle` starts it.
 */
export function toEmitterConfig(layer: ParticleLayerDef, ctx: EmitterContext): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
  const fade = FADES[layer.fade ?? 'in-out'];
  const rate = (layer.rate ?? 0) * ctx.particleScale;
  const zone = emitZone(layer.area ?? 'point', ctx.origin, ctx.stage);

  const config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
    ...sizeOps(layer),
    ...windOps(layer),
    emitting: false,
    lifespan: toOp(layer.lifespan),
    speedX: toOp(layer.velocity?.x ?? 0),
    speedY: toOp(layer.velocity?.y ?? 0),
    gravityY: layer.gravity ?? 0,
    alpha: { onEmit: () => fade(0), onUpdate: (_p: unknown, _k: string, t: number) => fade(t) },
    tint: { onEmit: () => colorInt(pickColor(layer.colors)) },
    rotate: {
      onEmit: (p?: Phaser.GameObjects.Particles.Particle) => {
        const particle = p as FxParticle;
        particle.fxSeed = Math.random() * 1000;
        particle.fxAngle = pick(layer.angle ?? 0);
        particle.fxSpin = pick(layer.spin ?? 0);
        return particle.fxAngle;
      },
      onUpdate: (p: Phaser.GameObjects.Particles.Particle, _k: string, t: number) => {
        const particle = p as FxParticle;
        return particle.fxAngle + particle.fxSpin * (t * particle.life) / 1000;
      },
    },
    blendMode: layer.blend === 'normal' ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD,
    // 0 means "never on a timer": bursts only.
    frequency: rate > 0 ? 1000 / rate : -1,
    maxAliveParticles: Math.max(1, Math.round((layer.maxAlive ?? 100) * ctx.particleScale)),
    ...(zone ? { emitZone: zone } : {}),
  };
  return { ...config, ...layer.emitter };
}
