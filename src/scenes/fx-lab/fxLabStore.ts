import { makeAutoObservable } from 'mobx';
import { FX } from '../../data/fx';
import { LIGHTING } from '../../data/lighting';
import { DEFAULT_CRT, type CrtSettings } from '../../fx/crt';
import type { Flicker, FxDef, FxQuality, LightingMood } from '../../fx/types';

/** The lab's own light, which follows the pointer. Lights in scenes come from FX (light layers). */
export interface LightSettings {
  on: boolean;
  color: string;
  intensity: number;
  radius: number;
  /** Height above the sprite, as a fraction of the radius. Low is raking side light, high is flat overhead light. */
  height: number;
  flicker?: Flicker;
}

export interface LightingSettings {
  lit: boolean;
  followPointer: boolean;
  ambient: string;
  /** Number of light steps (0 = smooth). */
  bands: number;
  /** 0 is a hard edge between steps, 1 a smooth ramp. */
  bandSoftness: number;
  key: LightSettings;
}

const DEFAULT_KEY: LightSettings = { on: true, color: '#ffffff', intensity: 1, radius: 400, height: 0.2 };

/** Turns a mood from `data/lighting.ts` into panel settings. The pointer light and view toggles are kept. */
export const moodToSettings = (mood: LightingMood, current?: LightingSettings): LightingSettings => ({
  lit: current?.lit ?? true,
  followPointer: current?.followPointer ?? true,
  ambient: mood.ambient,
  bands: mood.bands,
  bandSoftness: mood.bandSoftness,
  key: { ...(current?.key ?? DEFAULT_KEY) },
});

/** The mood the panel describes. */
export const settingsToMood = (s: LightingSettings): LightingMood => ({
  ambient: s.ambient,
  bands: s.bands,
  bandSoftness: s.bandSoftness,
});

/** Moods the panel offers: every one in `data/lighting.ts`. */
export const PRESETS = LIGHTING;

const copy = (settings: LightingSettings): LightingSettings => clone(settings);

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

/** The settings that make up a mood: the panel matches a preset when these do. */
const lookOf = ({ ambient, bands, bandSoftness }: LightingSettings) => JSON.stringify({ ambient, bands, bandSoftness });

/** A path into an FX definition, e.g. `['layers', 0, 'light', 'radius']`. */
export type DraftPath = (string | number)[];

export type LabTab = 'fx' | 'lighting';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export class FxLabStore {
  settings: LightingSettings = moodToSettings(LIGHTING.firelit);
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
    this.draftParent(path)[path[path.length - 1]] = value;
  }

  removeDraft(path: DraftPath) {
    const parent = this.draftParent(path);
    const key = path[path.length - 1];
    if (Array.isArray(parent)) parent.splice(Number(key), 1);
    else delete parent[key];
  }

  /** The object or array that holds the last key of `path` in the draft. */
  private draftParent(path: DraftPath): Record<string | number, unknown> & unknown[] {
    type Node = Record<string | number, unknown> & unknown[];
    return path.slice(0, -1).reduce<Node>((node, key) => node[key] as Node, this.draft as unknown as Node);
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

  setLight<K extends keyof LightSettings>(field: K, value: LightSettings[K]) {
    this.settings.key[field] = value;
  }

  setGrid<K extends keyof PixelGrid>(field: K, value: PixelGrid[K]) {
    this.grid[field] = value;
  }

  applyPreset(name: string) {
    this.settings = copy(moodToSettings(PRESETS[name], this.settings));
  }

  setPanelOpen(open: boolean) {
    this.panelOpen = open;
  }
}
