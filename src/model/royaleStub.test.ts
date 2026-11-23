import { describe, expect, it } from 'vitest';
import { applyRoyale, ordinal, PLACEMENT_ELO, stubRoyale } from './royaleStub';
import { GameState } from '../state/gameState';
import { newGameState } from '../data/new-game';

describe('stubRoyale', () => {
  it('is repeatable and in range', () => {
    for (let seed = 0; seed < 100; seed++) {
      const result = stubRoyale(['thief', 'rena', 'witch'], seed, 1);
      expect(stubRoyale(['thief', 'rena', 'witch'], seed, 1)).toEqual(result);
      expect(result.placement).toBeGreaterThanOrEqual(1);
      expect(result.placement).toBeLessThanOrEqual(8);
      expect(result.elo).toBe(PLACEMENT_ELO[result.placement - 1]);
      expect(result.gold).toBeGreaterThan(0);
    }
  });

  it('writes results into the game and forgets intel', () => {
    const state = new GameState(newGameState());
    state.learnIntel('match-rules');
    applyRoyale(state, { week: 1, placement: 2, elo: 20, gold: 22, history: [{ student: 'thief', event: 'humiliated' }] });
    expect(state.elo).toBe(1020);
    expect(state.gold).toBe(22);
    expect(state.hasHistory('thief', 'humiliated')).toBe(true);
    expect(state.intel).toEqual([]);
  });

  it('writes ordinals', () => {
    expect([1, 2, 3, 4, 8, 11, 12, 13, 21].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '8th', '11th', '12th', '13th', '21st']);
  });
});
