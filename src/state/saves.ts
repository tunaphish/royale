import type { GameStateData } from './gameState';
import { clampDisposition } from '../model/disposition';
import { newSeed, STARTING_ELO } from '../data/new-game';

/**
 * Where saves are kept. Browser localStorage for now; a phone build can swap
 * in native storage by implementing this interface.
 */
export interface SaveStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export const localStorageStorage: SaveStorage = {
  get: (key) => localStorage.getItem(key),
  set: (key, value) => localStorage.setItem(key, value),
  remove: (key) => localStorage.removeItem(key),
};

/** Bump this whenever GameStateData changes shape, and add a migration below. */
export const SAVE_VERSION = 3;

/**
 * Upgrades a save from version N to N + 1. To change the save format:
 * bump SAVE_VERSION and add `[oldVersion]: (state) => newState`.
 */
// Old saves have no type of their own (that's why they need migrating), so steps take and return any.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MIGRATIONS: Record<number, (state: any) => any> = {
  // v2 added the values ink reads and writes
  1: (state) => ({ ...state, stats: {}, flags: {}, relationships: {} }),
  // v3 added the school sim: spirits became gold, relationships became students' dispositions
  2: ({ spirits, relationships, ...state }) => ({
    ...state,
    gold: spirits ?? 0,
    elo: STARTING_ELO,
    students: Object.fromEntries(
      Object.entries((relationships ?? {}) as Record<string, number>).map(([student, value]) => [
        student,
        { disposition: clampDisposition(value), moods: [] },
      ]),
    ),
    calendar: { time: 0, lostSlots: [], seed: newSeed() },
    stars: [],
    history: [],
    intel: [],
    inventory: {},
  }),
};

export type SaveFile = { version: number; savedAt: number; state: GameStateData };

/** What a slot picker needs to show, without loading the whole save. */
export type SlotSummary = { id: string; name: string; savedAt: number };

export type Settings = {
  /** Master volume, 0 to 1. */
  volume: number;
  /** How fast lines type out: 1 is normal, 2 twice as fast. */
  textSpeed: number;
  /** `'low'` halves particles and turns off bloom, for older phones. */
  fxQuality: 'high' | 'low';
  /** Skips screen shake and flashes. */
  reducedMotion: boolean;
  /** Shows story screens through an old CRT TV filter (`fx/crt.ts`). */
  crt: boolean;
};
const DEFAULT_SETTINGS: Settings = { volume: 1, textSpeed: 1, fxQuality: 'high', reducedMotion: false, crt: false };

const KEYS = {
  settings: 'royale:settings',
  slots: 'royale:slots',
  save: (slotId: string) => `royale:save:${slotId}`,
};

export class SaveManager {
  constructor(private readonly storage: SaveStorage) {}

  listSlots(): SlotSummary[] {
    return this.readJson<SlotSummary[]>(KEYS.slots) ?? [];
  }

  save(slotId: string, state: GameStateData, name = slotId): void {
    const savedAt = Date.now();
    const file: SaveFile = { version: SAVE_VERSION, savedAt, state };
    this.storage.set(KEYS.save(slotId), JSON.stringify(file));

    const slots = this.listSlots().filter((slot) => slot.id !== slotId);
    slots.push({ id: slotId, name, savedAt });
    this.storage.set(KEYS.slots, JSON.stringify(slots));
  }

  /**
   * The slot's game state, upgraded to the current format, or null if the
   * slot is empty or can't be read. Unreadable saves are backed up first so
   * a new game can't overwrite them.
   */
  load(slotId: string): GameStateData | null {
    const key = KEYS.save(slotId);
    const raw = this.storage.get(key);
    if (raw === null) return null;

    try {
      const file = JSON.parse(raw) as SaveFile;
      if (file.version > SAVE_VERSION) {
        throw new Error(`save is version ${file.version}, this build reads up to ${SAVE_VERSION}`);
      }
      return migrate(file).state;
    } catch (error) {
      const backupKey = `${key}:unreadable-${Date.now()}`;
      this.storage.set(backupKey, raw);
      console.error(`[saves] couldn't load ${key}, backed it up to ${backupKey}`, error);
      return null;
    }
  }

  deleteSlot(slotId: string): void {
    this.storage.remove(KEYS.save(slotId));
    const slots = this.listSlots().filter((slot) => slot.id !== slotId);
    this.storage.set(KEYS.slots, JSON.stringify(slots));
  }

  /** Settings are shared by every slot, so starting a new game doesn't reset them. */
  loadSettings(): Settings {
    return { ...DEFAULT_SETTINGS, ...this.readJson<Partial<Settings>>(KEYS.settings) };
  }

  saveSettings(settings: Settings): void {
    this.storage.set(KEYS.settings, JSON.stringify(settings));
  }

  private readJson<T>(key: string): T | null {
    const raw = this.storage.get(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      console.error(`[saves] ${key} isn't valid JSON`);
      return null;
    }
  }
}

const migrate = (file: SaveFile): SaveFile => {
  let { version, state } = file;
  while (version < SAVE_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) throw new Error(`no migration from save version ${version}`);
    state = step(state);
    version++;
  }
  return { ...file, version, state };
};
