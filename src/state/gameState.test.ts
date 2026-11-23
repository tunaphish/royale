import { describe, expect, it } from 'vitest';
import { GameState } from './gameState';
import { newGameState } from '../data/new-game';

const fresh = () => new GameState(newGameState());

describe('GameState', () => {
  it('keeps dispositions within -10..10, neutral by default', () => {
    const state = fresh();
    expect(state.disposition('rena')).toBe(0);
    state.addDisposition('rena', 4);
    state.addDisposition('rena', 20);
    expect(state.disposition('rena')).toBe(10);
    state.addDisposition('thief', -30);
    expect(state.disposition('thief')).toBe(-10);
  });

  it('expires moods after their slots', () => {
    const state = fresh();
    state.setMood('rena', 'embarrassed', 2);
    expect(state.hasMood('rena', 'embarrassed')).toBe(true);
    state.calendar.time = 1;
    expect(state.hasMood('rena', 'embarrassed')).toBe(true);
    state.calendar.time = 2;
    expect(state.hasMood('rena', 'embarrassed')).toBe(false);
  });

  it('replaces a mood when set again, and removes it with 0', () => {
    const state = fresh();
    state.setMood('rena', 'grateful', 1);
    state.setMood('rena', 'grateful', 5);
    expect(state.students.rena.moods).toEqual([{ mood: 'grateful', until: 5 }]);
    state.setMood('rena', 'grateful', 0);
    expect(state.hasMood('rena', 'grateful')).toBe(false);
  });

  it('lights stars, records history and intel once', () => {
    const state = fresh();
    state.lightStar('rena-first-meeting');
    state.lightStar('rena-first-meeting');
    expect(state.stars).toEqual(['rena-first-meeting']);

    state.addHistory('thief', 'humiliated');
    expect(state.hasHistory('thief', 'humiliated')).toBe(true);
    expect(state.hasHistory('rena', 'humiliated')).toBe(false);

    state.learnIntel('match-rules');
    state.learnIntel('match-rules');
    expect(state.intel).toEqual(['match-rules']);
  });

  it('never lets gold go negative', () => {
    const state = fresh();
    state.addGold(5);
    state.addGold(-8);
    expect(state.gold).toBe(0);
  });
});

describe('GameState school helpers', () => {
  it('adds stat points, items and lost slots', () => {
    const state = fresh();
    state.addStat('wit', 3);
    state.addStat('wit', 2);
    expect(state.stat('wit')).toBe(5);

    state.addItem('pie', 2);
    state.addItem('pie', -5);
    expect(state.items('pie')).toBe(0);
    expect(state.inventory).toEqual({});

    state.loseSlots([3, 4]);
    state.loseSlots([4]);
    expect(state.calendar.lostSlots).toEqual([3, 4]);
  });
});
