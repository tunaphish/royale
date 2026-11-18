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
  key: LightSettings;
  /** A second light fixed behind her shoulder, for colored edge light. */
  rim: LightSettings;
}

export const PRESETS: Record<string, LightingSettings> = {
  soft: {
    lit: true,
    followPointer: true,
    ambient: '#5a5868',
    selfShadow: true,
    penumbra: 0.5,
    key: { on: true, color: '#ffe9cc', intensity: 1, radius: 420, height: 0.25 },
    rim: { on: false, color: '#8fb4ff', intensity: 0.8, radius: 360, height: 0.15 },
  },
  candle: {
    lit: true,
    followPointer: true,
    ambient: '#2a1e1e',
    selfShadow: true,
    penumbra: 0.5,
    key: { on: true, color: '#ffb36b', intensity: 1.4, radius: 300, height: 0.08 },
    rim: { on: false, color: '#ff7a3d', intensity: 0.6, radius: 300, height: 0.1 },
  },
  moonlight: {
    lit: true,
    followPointer: true,
    ambient: '#232a40',
    selfShadow: true,
    penumbra: 0.5,
    key: { on: true, color: '#b9ccff', intensity: 0.9, radius: 460, height: 0.3 },
    rim: { on: true, color: '#6f8cff', intensity: 0.9, radius: 380, height: 0.1 },
  },
  neon: {
    lit: true,
    followPointer: true,
    ambient: '#2a1f36',
    selfShadow: true,
    penumbra: 0.5,
    key: { on: true, color: '#ff6ad5', intensity: 1.1, radius: 380, height: 0.12 },
    rim: { on: true, color: '#3ef0ff', intensity: 1.2, radius: 400, height: 0.08 },
  },
};

const copy = (settings: LightingSettings): LightingSettings => ({
  ...settings,
  key: { ...settings.key },
  rim: { ...settings.rim },
});

export class LightingTestStore {
  settings: LightingSettings = copy(PRESETS.soft);
  panelOpen = true;

  constructor() {
    makeAutoObservable(this);
  }

  set<K extends keyof LightingSettings>(field: K, value: LightingSettings[K]) {
    this.settings[field] = value;
  }

  setLight<K extends keyof LightSettings>(light: 'key' | 'rim', field: K, value: LightSettings[K]) {
    this.settings[light][field] = value;
  }

  applyPreset(name: string) {
    this.settings = copy(PRESETS[name]);
  }

  setPanelOpen(open: boolean) {
    this.panelOpen = open;
  }
}
