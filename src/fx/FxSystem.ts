import * as Phaser from 'phaser';
import { FX } from '../data/fx';
import { LIGHTING } from '../data/lighting';
import { FxHandle } from './FxHandle';
import { LightMap, MAP_GAIN } from './LightMap';
import { LitMaterial, type LitOptions } from './LitMaterial';
import {
  assignSlots, CandidatePool, flickerAt, moodBetween, moodLightCandidate,
  newPointUniforms, packPointUniforms, POINT_SLOTS,
} from './lights';
import { channels, colorInt } from './random';
import { ensureBuiltinTextures } from './textures';
import { DEPTH, type FxDef, type FxQuality, type LightingMood, type MoodLight, type PlayOptions } from './types';
import type GameSession from '../plugins/GameSession';

/** Size of one art pixel on screen. Light snaps to this grid. */
export const ART_PIXEL = 4;

/** Particles alive across every FX in a scene, at most. Past this, new FX spawn nothing. */
export const PARTICLE_BUDGET = 300;

/** A light a scene owns directly (a torch prop, a light following the pointer). Always gets a point slot. */
export interface SceneLight extends MoodLight {
  /** Screen position. `at` is ignored for scene lights. */
  x: number;
  y: number;
  /** Turn off without removing. */
  on: boolean;
}

/**
 * Scene plugin, `this.fx` in every scene: plays FX, owns the lighting
 * (mood, scene lights, point slots, light map) and cleans everything up when
 * the scene shuts down. Scenes that never use it pay nothing: lighting is set
 * up the first time something is lit.
 *
 * Each frame, after the scene's `update`:
 *   1. gather every light: mood, scene lights, lit particles
 *   2. give the best ones point slots; the rest go into the light map
 *   3. pack the shared uniforms that every lit material reads
 */
export class FxSystem extends Phaser.Plugins.ScenePlugin {
  quality: FxQuality = 'high';
  reducedMotion = false;
  /** Art pixel size on screen, for lit layers that don't set their own. */
  artPixel = ART_PIXEL;

  private handles: FxHandle[] = [];
  private materials: LitMaterial[] = [];
  private sceneLights: SceneLight[] = [];
  private lightMap?: LightMap;
  private readonly pool = new CandidatePool();
  private readonly points = newPointUniforms();
  private readonly ambient = [1, 1, 1];
  private readonly stageSize = [1, 1];
  private readonly rgb = { r: 1, g: 1, b: 1 };
  /** The scene this plugin belongs to. (`scene` on the base class is nullable.) */
  host: Phaser.Scene;

  private mood: LightingMood = LIGHTING.flat;
  /** The mood whose FX are playing (the target of a fade), and those FX. */
  private moodTarget: LightingMood = LIGHTING.flat;
  private moodFx: FxHandle[] = [];
  private fade?: { from: LightingMood; to: LightingMood; start: number; time: number };

  /** Last frame's numbers, for the FX lab. */
  readonly stats = { particles: 0, pointLights: 0, mapLights: 0, fx: 0 };

  boot(): void {
    this.host = this.scene!;
    const events = this.systems!.events;
    events.on(Phaser.Scenes.Events.START, this.onStart, this);
    events.on(Phaser.Scenes.Events.POST_UPDATE, this.frame, this);
    events.on(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    events.once(Phaser.Scenes.Events.DESTROY, this.destroy, this);
  }

  private onStart(): void {
    ensureBuiltinTextures(this.host.textures);
    const session = this.host.plugins.get('game-session') as GameSession | null;
    const settings = session?.saves.loadSettings();
    this.quality = settings?.fxQuality ?? 'high';
    this.reducedMotion = settings?.reducedMotion ?? false;
    this.mood = LIGHTING.flat;
    this.moodTarget = LIGHTING.flat;
    this.moodFx = [];
    this.fade = undefined;
  }

  /** Texture key of this scene's light map, created on first use. */
  get lightMapKey(): string {
    if (!this.lightMap) {
      const { width, height } = this.host.scale;
      this.lightMap = new LightMap(this.host, width, height, this.artPixel);
      // The map covers the whole canvas from (0, 0), which is always at least the stage.
      this.stageSize[0] = width;
      this.stageSize[1] = height;
    }
    return this.lightMap.key;
  }

  /**
   * Plays an FX from `data/fx.ts`. A number duration stops it after that many
   * ms; `'infinite'` runs until you call `stop()` on the handle.
   */
  play(id: string, options: PlayOptions = {}): FxHandle {
    const def = FX[id];
    if (!def) throw new Error(`Unknown FX "${id}". Add it to src/data/fx.ts.`);
    return this.playDef(def, options, id);
  }

  /** Plays an FX definition that isn't in `data/fx.ts`, e.g. one being edited in the lab. */
  playDef(def: FxDef, options: PlayOptions = {}, id = 'custom'): FxHandle {
    if (this.particleCount() >= PARTICLE_BUDGET) {
      console.warn(`FX "${id}": particle budget (${PARTICLE_BUDGET}) reached; it will spawn little or nothing.`);
    }
    const handle = new FxHandle(this, id, def, options);
    this.handles.push(handle);
    return handle;
  }

  /** Stops every running FX, the mood's included. */
  stopAll(options?: { immediate?: boolean }): void {
    for (const handle of this.handles) handle.stop(options);
  }

  /** Changes the lighting mood: an ID from `data/lighting.ts`, or a mood object. */
  setMood(mood: string | LightingMood, options: { fade?: number } = {}): void {
    const target = typeof mood === 'string' ? LIGHTING[mood] : mood;
    if (!target) throw new Error(`Unknown lighting mood "${mood}". Add it to src/data/lighting.ts.`);
    this.startMoodFx(target);
    const fade = options.fade ?? 0;
    if (fade <= 0) {
      this.mood = target;
      this.fade = undefined;
    } else {
      this.fade = { from: this.currentMood, to: target, start: this.host.time.now, time: fade };
    }
  }

  /** Stops the old mood's FX and starts the new one's. The same mood again keeps them running. */
  private startMoodFx(target: LightingMood): void {
    if (target === this.moodTarget) return;
    this.moodTarget = target;
    for (const handle of this.moodFx) handle.stop();
    this.moodFx = (target.fx ?? []).map(({ id, at }) =>
      this.play(id, { at: { stage: at ?? [0.5, 0.5] }, duration: 'infinite' }));
  }

  /** The mood being drawn right now (mid-fade, a blend). */
  get currentMood(): LightingMood {
    return this.mood;
  }

  /** Draws an image with lighting. See `LitMaterial`. */
  lit(image: Phaser.GameObjects.Image, options?: LitOptions): LitMaterial {
    const material = new LitMaterial(this, image, options);
    this.materials.push(material);
    return material;
  }

  /** Stops lighting a material and removes it. The source image is left alone. */
  unlit(material: LitMaterial): void {
    this.materials = this.materials.filter((m) => m !== material);
    material.destroy();
  }

  /**
   * The stage's size: the main camera's view. FX play in the middle of it by
   * default, `stage` areas fill it, and mood light positions are fractions of it.
   */
  get stage(): { width: number; height: number } {
    const camera = this.host.cameras.main;
    return { width: camera.width, height: camera.height };
  }

  /** Debug: where the point slots are this frame. */
  debugSlots(): { x: number; y: number; radius: number; intensity: number }[] {
    const slots = [];
    for (let i = 0; i < this.pool.count; i++) {
      const c = this.pool.items[i];
      if (c.inSlot) slots.push({ x: c.x, y: c.y, radius: c.radius, intensity: c.intensity });
    }
    return slots;
  }

  /** Adds a light the scene controls directly. Move it by changing `x`/`y`. */
  addLight(light: Omit<SceneLight, 'at' | 'on'> & { on?: boolean }): SceneLight {
    const sceneLight: SceneLight = { ...light, at: [0, 0], on: light.on ?? true };
    this.sceneLights.push(sceneLight);
    return sceneLight;
  }

  removeLight(light: SceneLight): void {
    this.sceneLights = this.sceneLights.filter((l) => l !== light);
  }

  private lightMapView?: Phaser.GameObjects.Image;

  /** Debug: draws the light map over the whole stage, to see where map light lands. */
  showLightMap(on: boolean): void {
    this.lightMapView?.destroy();
    this.lightMapView = undefined;
    if (!on) return;
    const key = this.lightMapKey;
    this.lightMapView = this.host.add.image(0, 0, key)
      .setOrigin(0, 0)
      .setDisplaySize(this.lightMap!.width, this.lightMap!.height)
      .setDepth(DEPTH.top + 1);
  }

  /** Called by lit materials while drawing. */
  setSharedUniforms(setUniform: (name: string, value: unknown) => void): void {
    setUniform('uAmbient', this.ambient);
    setUniform('uBands', this.mood.bands);
    setUniform('uBandSoftness', this.mood.bandSoftness);
    setUniform('uLightPos[0]', this.points.pos);
    setUniform('uLightColor[0]', this.points.color);
    setUniform('uLightRadius[0]', this.points.radius);
    setUniform('uLightIntensity[0]', this.points.intensity);
    setUniform('uLightBehind[0]', this.points.behind);
    setUniform('uStageSize', this.stageSize);
    setUniform('uMapGain', MAP_GAIN);
  }

  private particleCount(): number {
    let count = 0;
    for (const handle of this.handles) count += handle.particleCount;
    return count;
  }

  private frame(): void {
    const scene = this.host;
    const now = scene.time.now;
    const seconds = now / 1000;
    const { width, height } = this.stage;

    if (this.fade) {
      const t = Math.min((now - this.fade.start) / this.fade.time, 1);
      this.mood = moodBetween(this.fade.from, this.fade.to, t);
      if (t >= 1) {
        this.mood = this.fade.to;
        this.fade = undefined;
      }
    }

    for (const handle of this.handles) handle.tick();
    if (this.handles.some((h) => h.isFinished)) this.handles = this.handles.filter((h) => !h.isFinished);

    this.stats.fx = this.handles.length;
    this.stats.particles = this.particleCount();
    if (this.materials.length === 0) return;

    // 1. Gather.
    const pool = this.pool;
    pool.reset();
    const mood = this.mood;
    channels(colorInt(mood.ambient), this.rgb);
    this.ambient[0] = this.rgb.r;
    this.ambient[1] = this.rgb.g;
    this.ambient[2] = this.rgb.b;
    mood.lights.forEach((light, i) => moodLightCandidate(light, width, height, seconds, i * 17.3, pool.next()));
    this.sceneLights.forEach((light, i) => {
      if (!light.on) return;
      const c = pool.next();
      moodLightCandidate(light, width, height, seconds, 100 + i * 17.3, c);
      c.x = light.x;
      c.y = light.y;
      c.intensity = light.intensity * flickerAt(light.flicker, seconds, 100 + i * 17.3);
    });
    for (const handle of this.handles) handle.collectLights(pool, seconds);

    // 2. Assign.
    this.stats.pointLights = assignSlots(pool, POINT_SLOTS);
    this.lightMap?.draw(pool);
    this.stats.mapLights = this.lightMap?.lastCount ?? 0;

    // 3. Pack.
    packPointUniforms(pool, this.points);
    for (const material of this.materials) material.sync();
  }

  private shutdown(): void {
    for (const handle of this.handles) handle.stop({ immediate: true });
    this.handles = [];
    this.moodFx = [];
    this.moodTarget = LIGHTING.flat;
    for (const material of this.materials) material.destroy();
    this.materials = [];
    this.sceneLights = [];
    this.lightMap?.destroy();
    this.lightMap = undefined;
    this.lightMapView = undefined;
  }

  destroy(): void {
    this.shutdown();
    super.destroy();
  }
}
