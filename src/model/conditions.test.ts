import { describe, expect, it } from 'vitest';
import { check, when, type ConditionContext } from './conditions';
import { GameState } from '../state/gameState';
import { newGameState } from '../data/new-game';
import { timeOf } from './calendar';

const context = (setup?: (state: GameState) => void, extra?: Partial<ConditionContext>): ConditionContext => {
  const state = new GameState(newGameState());
  setup?.(state);
  return { state, ...extra };
};

describe('check', () => {
  it('holds when there is no condition', () => {
    expect(check(undefined, context())).toBe(true);
  });

  it('reads social stat ranks', () => {
    const ctx = context((s) => s.addStat('wit', 4));
    expect(check(when.rank('wit', 2), ctx)).toBe(true);
    expect(check(when.rank('wit', 3), ctx)).toBe(false);
  });

  it('reads disposition bands for the named or involved student', () => {
    const ctx = context((s) => s.addDisposition('rena', 3), { student: 'rena' });
    expect(check(when.band('warm'), ctx)).toBe(true);
    expect(check(when.band('close'), ctx)).toBe(false);
    expect(check(when.bandAtMost('neutral'), ctx)).toBe(false);
    expect(check(when.band('warm', 'thief'), ctx)).toBe(false);
    expect(check(when.bandAtMost('neutral', 'thief'), ctx)).toBe(true);
  });

  it('fails student conditions when no student is involved', () => {
    expect(check(when.band('hostile'), context())).toBe(false);
  });

  it('reads moods, stars, history, flags, intel and gold', () => {
    const ctx = context((s) => {
      s.setMood('thief', 'furious', 2);
      s.lightStar('thief-1');
      s.addHistory('thief', 'humiliated');
      s.setFlag('met', true);
      s.learnIntel('rules');
      s.addGold(10);
    }, { student: 'thief' });
    expect(check(when.mood('furious'), ctx)).toBe(true);
    expect(check(when.star('thief-1'), ctx)).toBe(true);
    expect(check(when.history('humiliated'), ctx)).toBe(true);
    expect(check(when.history('spared'), ctx)).toBe(false);
    expect(check(when.flag('met'), ctx)).toBe(true);
    expect(check(when.flag('met', false), ctx)).toBe(false);
    expect(check(when.flag('other', false), ctx)).toBe(true);
    expect(check(when.intel('rules'), ctx)).toBe(true);
    expect(check(when.studentIntel('deck'), ctx)).toBe(false);
    (ctx.state as GameState).learnIntel('deck:thief');
    expect(check(when.studentIntel('deck'), ctx)).toBe(true);
    expect(check(when.gold(10), ctx)).toBe(true);
    expect(check(when.gold(11), ctx)).toBe(false);
  });

  it('reads the calendar and location', () => {
    const ctx = context((s) => s.setTime(timeOf(2, 'mon', 'afternoon')), { location: 'library' });
    expect(check(when.day('mon', 'tue'), ctx)).toBe(true);
    expect(check(when.day('sat'), ctx)).toBe(false);
    expect(check(when.slot('afternoon'), ctx)).toBe(true);
    expect(check(when.weekend(), ctx)).toBe(false);
    expect(check(when.weekday(), ctx)).toBe(true);
    expect(check(when.week(2), ctx)).toBe(true);
    expect(check(when.week(3), ctx)).toBe(false);
    expect(check(when.at('library'), ctx)).toBe(true);
  });

  it('combines with all, any and not', () => {
    const ctx = context((s) => s.addStat('nerve', 4));
    const yes = when.rank('nerve', 2);
    const no = when.rank('nerve', 3);
    expect(check(when.all(yes, no), ctx)).toBe(false);
    expect(check(when.any(yes, no), ctx)).toBe(true);
    expect(check(when.not(no), ctx)).toBe(true);
  });
});
