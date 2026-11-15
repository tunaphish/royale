import type { GameStateData } from './gameState';

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
export const SAVE_VERSION = 1;

/**
 * Upgrades a save from version N to N + 1. To change the save format:
 * bump SAVE_VERSION and add `[oldVersion]: (state) => newState`.
 */
const MIGRATIONS: Record<number, (state: any) => any> = {};

export type SaveFile = { version: number; savedAt: number; state: GameStateData };

/** What a slot picker needs to show, without loading the whole save. */
export type SlotSummary = { id: string; name: string; savedAt: number };

export type Settings = { volume: number; textSpeed: number };
const DEFAULT_SETTINGS: Settings = { volume: 1, textSpeed: 1 };

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
