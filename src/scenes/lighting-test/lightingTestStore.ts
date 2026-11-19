import { makeAutoObservable } from 'mobx';

export interface LightSettings {
  on: boolean;
  color: string;
  intensity: number;
  radius: number;
  /** Height above the sprite, as a fraction of the radius. Low is raking side light, high is flat overhead light. */
  height: number;
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

export const PRESETS: Record<string, LightingSettings> = {
  ember: {
    lit: true,
    followPointer: true,
    ambient: '#3a1418',
    selfShadow: true,
    penumbra: 0.5,
    bands: 3,
    bandSoftness: 0,
    key: { on: true, color: '#ffc890', intensity: 1.6, radius: 650, height: 0.2 },
    rim: { on: false, color: '#ff4a3d', intensity: 1, radius: 400, height: 0.1 },
  },
  soft: {
    lit: true,
    followPointer: true,
    ambient: '#5a5868',
    selfShadow: true,
    penumbra: 0.5,
    bands: 3,
    bandSoftness: 0.15,
    key: { on: true, color: '#ffe9cc', intensity: 1, radius: 420, height: 0.25 },
    rim: { on: false, color: '#8fb4ff', intensity: 0.8, radius: 360, height: 0.15 },
  },
  candle: {
    lit: true,
    followPointer: true,
    ambient: '#2a1e1e',
    selfShadow: true,
    penumbra: 0.5,
    bands: 2,
    bandSoftness: 0,
    key: { on: true, color: '#ffb36b', intensity: 1.4, radius: 300, height: 0.08 },
    rim: { on: false, color: '#ff7a3d', intensity: 0.6, radius: 300, height: 0.1 },
  },
  moonlight: {
    lit: true,
    followPointer: true,
    ambient: '#232a40',
    selfShadow: true,
    penumbra: 0.5,
    bands: 3,
    bandSoftness: 0.05,
    key: { on: true, color: '#b9ccff', intensity: 0.9, radius: 460, height: 0.3 },
    rim: { on: true, color: '#6f8cff', intensity: 0.9, radius: 380, height: 0.1 },
  },
  neon: {
    lit: true,
    followPointer: true,
    ambient: '#2a1f36',
    selfShadow: true,
    penumbra: 0.5,
    bands: 2,
    bandSoftness: 0,
    key: { on: true, color: '#ff6ad5', intensity: 1.1, radius: 380, height: 0.12 },
    rim: { on: true, color: '#3ef0ff', intensity: 1.2, radius: 400, height: 0.08 },
  },
};

const copy = (settings: LightingSettings): LightingSettings => ({
  ...settings,
  key: { ...settings.key },
  rim: { ...settings.rim },
});

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
const lookOf = ({ lit, followPointer, ...look }: LightingSettings) => JSON.stringify(look);

export class LightingTestStore {
  settings: LightingSettings = copy(PRESETS.ember);
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
  panelOpen = true;

  constructor() {
    makeAutoObservable(this);
  }

  /** The preset the current settings match, or undefined once anything is tweaked. */
  get activePreset(): string | undefined {
    const look = lookOf(this.settings);
    return Object.keys(PRESETS).find((name) => lookOf(PRESETS[name]) === look);
  }

  setForeground<K extends keyof ForegroundSettings>(field: K, value: ForegroundSettings[K]) {
    this.foreground[field] = value;
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
    this.settings = { ...copy(PRESETS[name]), lit: this.settings.lit, followPointer: this.settings.followPointer };
  }

  setPanelOpen(open: boolean) {
    this.panelOpen = open;
  }
}
