import { makeAutoObservable } from 'mobx';
import { FX } from '../../data/fx';
import { LIGHTING } from '../../data/lighting';
import { DEFAULT_CRT, type CrtSettings } from '../../fx/crt';
import type { Flicker, FxDef, FxQuality, LightingMood, LightMotion, MoodLight, StagePoint } from '../../fx/types';

export interface LightSettings {
  on: boolean;
  color: string;
  intensity: number;
  radius: number;
  /** Height above the sprite, as a fraction of the radius. Low is raking side light, high is flat overhead light. */
  height: number;
  flicker?: Flicker;
  /** Rim light only: where it is (default `RIM_AT`), whether it's behind the characters, how it moves. */
  at?: StagePoint;
  behind?: boolean;
  motion?: LightMotion;
}

export interface LightingSettings {
  lit: boolean;
  followPointer: boolean;
  ambient: string;
  /** Normal-map contact shadows on the sprite itself. */
  selfShadow: boolean;
  /** Softness of self-shadows. Lower is sharper but more jagged. */
  penumbra: number;
  /** Pixel mode: number of light steps (0 = smooth). */
  bands: number;
  /** Pixel mode: 0 is a hard edge between steps, 1 a smooth ramp. */
  bandSoftness: number;
  key: LightSettings;
  /** A second light fixed behind her shoulder, for colored edge light. */
  rim: LightSettings;
}

/** The test panel edits one key light and one rim light; moods are turned into that shape. */
const OFF_LIGHT: LightSettings = { on: false, color: '#ffffff', intensity: 1, radius: 400, height: 0.15 };

const toLightSettings = (light: MoodLight | undefined): LightSettings =>
  light
    ? {
      on: true, color: light.color, intensity: light.intensity, radius: light.radius, height: light.height, flicker: light.flicker,
      at: light.at, behind: light.behind, motion: light.motion,
    }
    : { ...OFF_LIGHT };

/** Turns a mood from `data/lighting.ts` into panel settings: its first light is the key, its second the rim. */
export const moodToSettings = (mood: LightingMood, current?: LightingSettings): LightingSettings => ({
  lit: current?.lit ?? true,
  followPointer: current?.followPointer ?? true,
  selfShadow: current?.selfShadow ?? true,
  penumbra: current?.penumbra ?? 0.5,
  ambient: mood.ambient,
  bands: mood.bands,
  bandSoftness: mood.bandSoftness,
  key: toLightSettings(mood.lights[0]),
  rim: toLightSettings(mood.lights[1]),
});

/** Where the rim light sits: behind her right shoulder. */
export const RIM_AT: [number, number] = [0.85, 0.2];

/** The mood the panel describes, minus the key light (which the scene moves itself). */
export const settingsToMood = (s: LightingSettings): LightingMood => ({
  ambient: s.ambient,
  bands: s.bands,
  bandSoftness: s.bandSoftness,
  lights: s.rim.on
    ? [{
      color: s.rim.color, intensity: s.rim.intensity, radius: s.rim.radius, height: s.rim.height,
      at: s.rim.at ?? RIM_AT, flicker: s.rim.flicker, behind: s.rim.behind, motion: s.rim.motion,
    }]
    : [],
});

/** Moods the panel offers: every one in `data/lighting.ts`. */
export const PRESETS = LIGHTING;

const copy = (settings: LightingSettings): LightingSettings => clone(settings);

/** Starting values when the rim light is given a motion in the panel. */
export const NEW_MOTION: Record<LightMotion['kind'], LightMotion> = {
  swing: { kind: 'swing', pivot: [0.5, -0.2], angle: 25, period: 3000 },
  pass: { kind: 'pass', to: [0.7, 0.6], time: 900, gap: 1500 },
};

/** How the art is lit: Phaser's smooth Light2D, or the pixel-snapped banded shader. */
export type LightingMode = 'pixel' | 'phaser';

/** The art's pixel grid. Depends on the sprite, not the mood, so presets leave it alone. */
export interface PixelGrid {
  /** Size of one art pixel, in texture pixels. */
  size: number;
  offsetX: number;
  offsetY: number;
}

/** The foreground layer, lit from behind. Kept apart from presets so they don't reset it. */
export interface ForegroundSettings {
  on: boolean;
  opacity: number;
  /** Blur filter strength. 0 is sharp. */
  blur: number;
  /** Direct light on the side we see, on top of ambient. */
  fill: number;
  /** How much light shows through, tinted by the layer's color. */
  translucency: number;
  /** Bright outline on edges facing a light. */
  rim: number;
  /** Rim thickness, in art pixels. */
  rimWidth: number;
  /** How far behind the layer the lights are, in screen pixels. Further is softer and wider. */
  depth: number;
  /** How far the layer moves against the pointer, in screen pixels. */
  parallax: number;
}

/** The settings that make up a preset's look; viewing toggles like `lit` don't count. */
const lookOf = ({ lit, followPointer, selfShadow, penumbra, ...look }: LightingSettings) => JSON.stringify(look);

/** A path into an FX definition, e.g. `['layers', 0, 'light', 'radius']`. */
export type DraftPath = (string | number)[];

export type LabTab = 'fx' | 'lighting';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export class FxLabStore {
  settings: LightingSettings = moodToSettings(LIGHTING.ember);
  /** The mood last picked. */
  preset = 'ember';
  /**
   * Shows the picked mood exactly as `data/lighting.ts` has it (every light where
   * it is, its FX playing) instead of as the panel's key and rim lights.
   */
  exactMood = false;
  mode: LightingMode = 'pixel';
  grid: PixelGrid = { size: 6, offsetX: 0, offsetY: 0 };
  /** Off lights the art as if it were flat, to compare with and without the normal map. */
  normalMap = true;
  foreground: ForegroundSettings = {
    on: true,
    opacity: 1,
    blur: 0,
    fill: 0.12,
    translucency: 0.9,
    rim: 1.5,
    rimWidth: 1,
    depth: 120,
    parallax: 12,
  };
  tab: LabTab = 'fx';
  /** The FX being tuned, and the edited copy of its definition. */
  fxId = Object.keys(FX)[0];
  draft: FxDef = clone(FX[Object.keys(FX)[0]]);
  /** One-shot FX replay on their own, so tuning a burst doesn't need a tap each time. */
  repeat = true;
  showLightMap = false;
  showSlots = false;
  quality: FxQuality = 'high';
  reducedMotion = false;
  stats = { fx: 0, particles: 0, pointLights: 0, mapLights: 0 };
  /** The draft as code, shown after "copy". */
  source: string | null = null;
  /** CRT TV filter over the whole lab. */
  crtOn = false;
  crt: CrtSettings = { ...DEFAULT_CRT };
  panelOpen = true;

  constructor() {
    makeAutoObservable(this);
  }

  /** The preset the current settings match, or undefined once anything is tweaked. */
  get activePreset(): string | undefined {
    const look = lookOf(this.settings);
    return Object.keys(PRESETS).find((name) => lookOf(moodToSettings(PRESETS[name])) === look);
  }

  setForeground<K extends keyof ForegroundSettings>(field: K, value: ForegroundSettings[K]) {
    this.foreground[field] = value;
  }

  setCrtOn(on: boolean) {
    this.crtOn = on;
  }

  setCrt<K extends keyof CrtSettings>(field: K, value: CrtSettings[K]) {
    this.crt[field] = value;
  }

  setTab(tab: LabTab) {
    this.tab = tab;
  }

  /** Starts editing an FX: a fresh copy of its definition. */
  selectFx(id: string) {
    this.fxId = id;
    this.draft = clone(FX[id]);
    this.source = null;
  }

  /** Puts the draft back to what `data/fx.ts` says. */
  resetDraft() {
    this.selectFx(this.fxId);
  }

  setDraft(path: DraftPath, value: unknown) {
    const parent = path.slice(0, -1).reduce<any>((node, key) => node[key], this.draft);
    parent[path[path.length - 1]] = value;
  }

  removeDraft(path: DraftPath) {
    const parent = path.slice(0, -1).reduce<any>((node, key) => node[key], this.draft);
    const key = path[path.length - 1];
    if (Array.isArray(parent)) parent.splice(Number(key), 1);
    else delete parent[key];
  }

  setRepeat(on: boolean) {
    this.repeat = on;
  }

  setShowLightMap(on: boolean) {
    this.showLightMap = on;
  }

  setShowSlots(on: boolean) {
    this.showSlots = on;
  }

  setQuality(quality: FxQuality) {
    this.quality = quality;
  }

  setReducedMotion(on: boolean) {
    this.reducedMotion = on;
  }

  setStats(stats: FxLabStore['stats']) {
    this.stats = stats;
  }

  setSource(source: string | null) {
    this.source = source;
  }

  setNormalMap(on: boolean) {
    this.normalMap = on;
  }

  set<K extends keyof LightingSettings>(field: K, value: LightingSettings[K]) {
    this.settings[field] = value;
  }

  setLight<K extends keyof LightSettings>(light: 'key' | 'rim', field: K, value: LightSettings[K]) {
    this.settings[light][field] = value;
  }

  setMode(mode: LightingMode) {
    this.mode = mode;
  }

  setGrid<K extends keyof PixelGrid>(field: K, value: PixelGrid[K]) {
    this.grid[field] = value;
  }

  applyPreset(name: string) {
    this.preset = name;
    this.settings = copy(moodToSettings(PRESETS[name], this.settings));
  }

  setExactMood(on: boolean) {
    this.exactMood = on;
  }

  /** Rim light motion: a kind's starting values, or none. */
  setRimMotion(kind: LightMotion['kind'] | null) {
    this.settings.rim.motion = kind ? clone(NEW_MOTION[kind]) : undefined;
  }

  /** Sets one field of the rim light's motion, e.g. `['pivot', 0]`. */
  setRimMotionField(path: (string | number)[], value: number) {
    const parent = path.slice(0, -1).reduce<any>((node, key) => node[key], this.settings.rim.motion);
    parent[path[path.length - 1]] = value;
  }

  setPanelOpen(open: boolean) {
    this.panelOpen = open;
  }
}
