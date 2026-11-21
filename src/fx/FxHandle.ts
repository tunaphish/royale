import * as Phaser from 'phaser';
import { resolveDuration, prewarmMs } from './duration';
import { toEmitterConfig, type FxParticle } from './emitter';
import { channels, colorInt } from './random';
import { flickerAt, type CandidatePool } from './lights';
import { spriteKey } from './textures';
import { DEPTH, type CameraLayerDef, type Duration, type FxDef, type ParticleLayerDef, type PlayOptions, type StopOptions } from './types';
import type { FxSystem } from './FxSystem';

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
  private stopTimer?: Phaser.Time.TimerEvent;
  private stopped = false;
  private finished = false;
  /** The FX's own light candidates are pushed here each frame. */
  private pool!: CandidatePool;
  private time = 0;

  constructor(private fx: FxSystem, readonly id: string, def: FxDef, options: PlayOptions) {
    this.done = new Promise((resolve) => (this.resolveDone = resolve));
    this.duration = resolveDuration(def, options.duration);
    const scene = fx.host;
    const { width, height } = fx.stage;
    const at = options.at ?? { x: width / 2, y: height / 2 };
    const follow = 'follow' in at ? at.follow : undefined;
    const origin = follow ? { x: follow.x, y: follow.y } : (at as { x: number; y: number });

    for (const layer of def.layers) {
      if (layer.kind === 'particles') this.addParticles(layer, origin, follow);
      else this.addCamera(layer);
    }
    if (def.sfx) scene.sound.play(def.sfx);

    const warm = prewarmMs(def);
    for (const { emitter } of this.emitters) if (warm > 0) emitter.fastForward(warm);

    if (this.duration !== 'infinite') {
      this.stopTimer = scene.time.delayedCall(this.duration, () => this.stop());
    }
  }

  private addParticles(layer: ParticleLayerDef, origin: { x: number; y: number }, follow?: Phaser.GameObjects.GameObject & { x: number; y: number }) {
    const scene = this.fx.host;
    const { width, height } = this.fx.stage;
    // `stage` areas don't follow: they always cover the stage.
    const stageArea = layer.area === 'stage';
    const at = stageArea ? { x: 0, y: 0 } : origin;
    const config = toEmitterConfig(layer, {
      origin: at,
      stage: { width, height },
      particleScale: this.fx.quality === 'low' ? 0.5 : 1,
    });
    const emitter = scene.add.particles(at.x, at.y, spriteKey(layer.sprite), config);
    emitter.setDepth(DEPTH[layer.depth ?? 'front']);
    if (follow && !stageArea) emitter.startFollow(follow);
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
      this.stopTimer?.remove();
      for (const { emitter } of this.emitters) emitter.stop();
      const camera = this.fx.host.cameras.main;
      for (const vignette of this.vignettes) camera.filters.external.remove(vignette);
      this.vignettes.length = 0;
    }
    if (options.immediate) this.finish();
  }

  /** Pushes this FX's lights into `pool`. Called by `FxSystem` every frame. */
  collectLights(pool: CandidatePool, timeSeconds: number): void {
    this.pool = pool;
    this.time = timeSeconds;
    for (const entry of this.emitters) {
      if (entry.collect) entry.emitter.forEachAlive(entry.collect, this);
    }
  }

  /** Called each frame: finishes the handle once it's stopped and empty. */
  tick(): void {
    if (this.finished || !this.stopped) return;
    if (this.emitters.every(({ emitter }) => emitter.getAliveParticleCount() === 0)) this.finish();
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
