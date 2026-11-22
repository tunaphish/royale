import * as Phaser from 'phaser';
import { resolveDuration, prewarmMs } from './duration';
import { toEmitterConfig, type FxParticle } from './emitter';
import { channels, colorInt } from './random';
import { applyMotion, flickerAt, pointLightCandidate, type CandidatePool } from './lights';
import { spriteKey } from './textures';
import {
  DEPTH, type CameraLayerDef, type Duration, type FxDef, type LightLayerDef, type ParticleLayerDef, type PlayOptions,
  type StagePoint, type StopOptions,
} from './types';
import type { FxSystem } from './FxSystem';

/** Default fade in and out of a light layer, in ms. */
export const LIGHT_FADE_MS = 500;

interface LightLayer {
  layer: LightLayerDef;
  /** Keeps flickers out of sync. */
  seed: number;
}

interface EmitterLayer {
  layer: ParticleLayerDef;
  emitter: Phaser.GameObjects.Particles.ParticleEmitter;
  /** Turns one live particle into a light. Made once per layer, so collecting allocates nothing. */
  collect?: (particle: Phaser.GameObjects.Particles.Particle) => void;
}

/**
 * One running FX. Returned by `this.fx.play`. Stopping lets live particles
 * finish; `done` resolves when the last one is gone.
 */
export class FxHandle {
  readonly done: Promise<void>;
  readonly duration: Duration;
  private resolveDone!: () => void;
  private readonly emitters: EmitterLayer[] = [];
  private readonly vignettes: Phaser.Filters.Vignette[] = [];
  private readonly lights: LightLayer[] = [];
  /** Where the FX is now: a fixed point, the followed object, or the stage-point anchor. */
  private position: { x: number; y: number };
  /** Scene time (ms) when it started and stopped, for light fades. */
  private startedAt: number;
  private stoppedAt = 0;
  private stopTimer?: Phaser.Time.TimerEvent;
  private stopped = false;
  private finished = false;
  /** The FX's own light candidates are pushed here each frame. */
  private pool!: CandidatePool;
  private time = 0;
  /** For FX played at a stage point: where that point is now. Emitters follow it. */
  private anchor?: { x: number; y: number; at: StagePoint };

  constructor(private fx: FxSystem, readonly id: string, def: FxDef, options: PlayOptions) {
    this.done = new Promise((resolve) => (this.resolveDone = resolve));
    this.duration = resolveDuration(def, options.duration);
    const scene = fx.host;
    const { width, height } = fx.stage;
    const at = options.at ?? { x: width / 2, y: height / 2 };
    if ('stage' in at) this.anchor = { x: at.stage[0] * width, y: at.stage[1] * height, at: at.stage };
    const follow = 'follow' in at ? at.follow : this.anchor;
    const origin = follow ? { x: follow.x, y: follow.y } : (at as { x: number; y: number });
    this.position = follow ?? origin;
    this.startedAt = scene.time.now;

    for (const layer of def.layers) {
      if (layer.kind === 'particles') this.addParticles(layer, origin, follow);
      else if (layer.kind === 'light') this.lights.push({ layer, seed: Math.random() * 1000 });
      else this.addCamera(layer);
    }
    if (def.sfx) {
      // A missing sound mustn't break the FX (the lab plays half-typed keys while you type).
      if (scene.cache.audio.exists(def.sfx)) scene.sound.play(def.sfx);
      else console.warn(`FX "${id}": no sound "${def.sfx}" in src/assets/audio`);
    }

    const warm = prewarmMs(def);
    for (const { emitter } of this.emitters) if (warm > 0) emitter.fastForward(warm);

    if (this.duration !== 'infinite') {
      this.stopTimer = scene.time.delayedCall(this.duration, () => this.stop());
    }
  }

  private addParticles(layer: ParticleLayerDef, origin: { x: number; y: number }, follow?: { x: number; y: number }) {
    const scene = this.fx.host;
    const { width, height } = this.fx.stage;
    // `stage` areas don't follow: they always cover the stage.
    const stageArea = layer.area === 'stage';
    const following = !!follow && !stageArea;
    // A following emitter spawns particles at the target's position but still draws them
    // offset by its own, so it must sit at (0, 0) or the offset counts twice.
    const at = stageArea || following ? { x: 0, y: 0 } : origin;
    const config = toEmitterConfig(layer, {
      origin: at,
      stage: { width, height },
      particleScale: this.fx.quality === 'low' ? 0.5 : 1,
    });
    const emitter = scene.add.particles(at.x, at.y, spriteKey(layer.sprite), config);
    emitter.setDepth(DEPTH[layer.depth ?? 'front']);
    // Phaser only runs acceleration ops when the starting acceleration is non-zero; wind and sway start at 0.
    if (layer.wind !== undefined || layer.sway) emitter.acceleration = true;
    if (following) emitter.startFollow(follow!);
    if ((layer.glow ?? 0) > 0 && this.fx.quality === 'high') {
      Phaser.Actions.AddEffectBloom(emitter, { threshold: 0.3, blurRadius: 2, blendAmount: layer.glow });
    }
    if ((layer.rate ?? 0) > 0) emitter.start();
    if ((layer.burst ?? 0) > 0) emitter.explode(Math.round(layer.burst! * (this.fx.quality === 'low' ? 0.5 : 1)));
    const entry: EmitterLayer = { layer, emitter };
    const light = layer.light;
    if (light) {
      entry.collect = (p) => {
        const particle = p as FxParticle;
        const c = this.pool.next();
        c.x = particle.worldPosition.x;
        c.y = particle.worldPosition.y;
        c.radius = light.radius;
        c.z = (light.height ?? 0.15) * light.radius;
        c.intensity = light.strength * particle.alpha * flickerAt(light.flicker, this.time, particle.fxSeed);
        channels(particle.tint, c);
        c.point = light.mode === 'point';
        c.priority = light.priority ?? 1;
      };
    }
    this.emitters.push(entry);
  }

  private addCamera(layer: CameraLayerDef) {
    const camera = this.fx.host.cameras.main;
    const calm = this.fx.reducedMotion;
    switch (layer.kind) {
      case 'shake':
        if (!calm) camera.shake(layer.time, layer.intensity);
        break;
      case 'flash': {
        // Flashes can be harmful to some players; reduced motion skips them.
        if (calm) break;
        const c = { r: 0, g: 0, b: 0 };
        channels(colorInt(layer.color), c);
        camera.flash(layer.time, c.r * 255, c.g * 255, c.b * 255);
        break;
      }
      case 'vignette': {
        const color = layer.color ? colorInt(layer.color) : 0x000000;
        this.vignettes.push(camera.filters.external.addVignette(0.5, 0.5, layer.radius, layer.strength, color));
        break;
      }
    }
  }

  /** True once stopped and every particle is gone. */
  get isFinished(): boolean {
    return this.finished;
  }

  /** Stop spawning. Live particles finish their lives unless `immediate`. */
  stop(options: StopOptions = {}): void {
    if (!this.stopped) {
      this.stopped = true;
      this.stoppedAt = this.fx.host.time.now;
      this.stopTimer?.remove();
      for (const { emitter } of this.emitters) emitter.stop();
      const camera = this.fx.host.cameras.main;
      for (const vignette of this.vignettes) camera.filters.external.remove(vignette);
      this.vignettes.length = 0;
    }
    if (options.immediate) this.finish();
  }

  /** Pushes this FX's lights into `pool`. Called by `FxSystem` every frame. `width`/`height` are the stage's. */
  collectLights(pool: CandidatePool, timeSeconds: number, width: number, height: number): void {
    this.pool = pool;
    this.time = timeSeconds;
    for (const entry of this.emitters) {
      if (entry.collect) entry.emitter.forEachAlive(entry.collect, this);
    }
    if (this.finished) return;
    const now = this.fx.host.time.now;
    for (const { layer, seed } of this.lights) {
      const fade = this.lightFade(layer, now);
      if (fade <= 0) continue;
      const c = pool.next();
      const offset = layer.offset;
      const x = this.position.x + (offset ? offset[0] * width : 0);
      const y = this.position.y + (offset ? offset[1] * height : 0);
      pointLightCandidate(layer, x, y, timeSeconds, seed, c);
      if (layer.motion) applyMotion(layer.motion, width, height, timeSeconds, c);
      c.intensity *= fade;
      c.behind = layer.behind ?? false;
      c.bands = layer.bands ?? -1;
      c.bandSoftness = layer.bandSoftness ?? -1;
    }
  }

  /** 0 to 1: a light layer fading in after the start, and out after a stop. */
  private lightFade(layer: LightLayerDef, now: number): number {
    const time = layer.fade ?? LIGHT_FADE_MS;
    if (time <= 0) return this.stopped ? 0 : 1;
    const fadeIn = Math.min((now - this.startedAt) / time, 1);
    const fadeOut = this.stopped ? 1 - (now - this.stoppedAt) / time : 1;
    return Math.max(Math.min(fadeIn, fadeOut), 0);
  }

  /**
   * Keeps a stage-point FX at its point when the stage resizes (or gets its real
   * size after the FX started, as in a story's first lines). Live particles move
   * with it, so a prewarmed FX doesn't start with its particles in the old place.
   */
  private moveAnchor(): void {
    const anchor = this.anchor!;
    const { width, height } = this.fx.stage;
    const dx = anchor.at[0] * width - anchor.x;
    const dy = anchor.at[1] * height - anchor.y;
    if (dx === 0 && dy === 0) return;
    anchor.x += dx;
    anchor.y += dy;
    for (const { layer, emitter } of this.emitters) {
      if (layer.area === 'stage') continue;
      emitter.forEachAlive((p) => {
        p.x += dx;
        p.y += dy;
      }, this);
    }
  }

  /** Called each frame: finishes the handle once it's stopped and empty. */
  tick(): void {
    if (this.anchor) this.moveAnchor();
    if (this.finished || !this.stopped) return;
    const now = this.fx.host.time.now;
    const lightsOut = this.lights.every(({ layer }) => this.lightFade(layer, now) <= 0);
    if (lightsOut && this.emitters.every(({ emitter }) => emitter.getAliveParticleCount() === 0)) this.finish();
  }

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    for (const { emitter } of this.emitters) emitter.destroy();
    this.emitters.length = 0;
    this.resolveDone();
  }

  /** Particles alive right now, for stats. */
  get particleCount(): number {
    let count = 0;
    for (const { emitter } of this.emitters) count += emitter.getAliveParticleCount();
    return count;
  }
}
