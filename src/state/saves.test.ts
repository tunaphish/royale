import { describe, expect, it } from 'vitest';
import { SAVE_VERSION, SaveManager, type SaveStorage } from './saves';

const memoryStorage = (): SaveStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    get: (key) => data.get(key) ?? null,
    set: (key, value) => void data.set(key, value),
    remove: (key) => void data.delete(key),
  };
};

const player = { health: 50, maxHealth: 70, maxEnergy: 3, deck: [], techniques: [] };

describe('save migrations', () => {
  it('turns a v2 save into the current format', () => {
    const storage = memoryStorage();
    const v2 = {
      player,
      spirits: 12,
      seenEnemies: [],
      stats: { nerve: 2 },
      flags: { met_witch: true },
      relationships: { witch: 3, eji: -14 },
    };
    storage.set('royale:save:main', JSON.stringify({ version: 2, savedAt: 0, state: v2 }));

    const state = new SaveManager(storage).load('main');

    expect(SAVE_VERSION).toBe(3);
    expect(state).toEqual({
      player,
      gold: 12,
      elo: 1000,
      seenEnemies: [],
      stats: { nerve: 2 },
      flags: { met_witch: true },
      students: {
        witch: { disposition: 3, moods: [] },
        eji: { disposition: -10, moods: [] },
      },
      calendar: { time: 0, lostSlots: [], seed: expect.any(Number) },
      stars: [],
      history: [],
      intel: [],
      inventory: {},
    });
  });

  it('takes a v1 save all the way up', () => {
    const storage = memoryStorage();
    const v1 = { player, spirits: 0, seenEnemies: [] };
    storage.set('royale:save:main', JSON.stringify({ version: 1, savedAt: 0, state: v1 }));

    const state = new SaveManager(storage).load('main');

    expect(state).toMatchObject({ gold: 0, students: {}, stats: {}, flags: {} });
    expect(state).not.toHaveProperty('spirits');
    expect(state).not.toHaveProperty('relationships');
  });
});
