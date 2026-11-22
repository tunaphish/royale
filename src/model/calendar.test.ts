import { describe, expect, it } from 'vitest';
import { advance, calendarAt, nextWeekStart, slotsToLose, SLOTS_PER_WEEK, timeOf } from './calendar';

describe('calendarAt', () => {
  it('starts on the first Saturday morning', () => {
    expect(calendarAt(0)).toEqual({
      time: 0, week: 1, day: 'sat', slot: 'morning', weekend: true, dayStart: true, lastOfWeek: false,
    });
  });

  it('ends the week on Thursday afternoon', () => {
    expect(calendarAt(11)).toMatchObject({ week: 1, day: 'thu', slot: 'afternoon', weekend: false, lastOfWeek: true });
    expect(calendarAt(12)).toMatchObject({ week: 2, day: 'sat', slot: 'morning' });
  });

  it('round-trips with timeOf', () => {
    for (let time = 0; time < SLOTS_PER_WEEK * 2; time++) {
      const { week, day, slot } = calendarAt(time);
      expect(timeOf(week, day, slot)).toBe(time);
    }
  });
});

describe('advance', () => {
  it('moves to the next slot', () => {
    expect(advance(0, [])).toEqual({ time: 1, skipped: [], royale: false });
  });

  it('skips lost slots', () => {
    expect(advance(2, [3, 4])).toEqual({ time: 5, skipped: [3, 4], royale: false });
  });

  it('says when the royale comes first', () => {
    expect(advance(11, [])).toEqual({ time: 12, skipped: [], royale: true });
    expect(advance(9, [10, 11])).toEqual({ time: 12, skipped: [10, 11], royale: true });
  });

  it('finds the next week', () => {
    expect(nextWeekStart(0)).toBe(12);
    expect(nextWeekStart(11)).toBe(12);
    expect(nextWeekStart(12)).toBe(24);
  });
});

describe('slotsToLose', () => {
  it('takes the next slots that are not already lost', () => {
    expect(slotsToLose(2, 2, [3])).toEqual([4, 5]);
  });

  it('stops at Thursday afternoon', () => {
    expect(slotsToLose(9, 5, [])).toEqual([10, 11]);
    expect(slotsToLose(11, 1, [])).toEqual([]);
  });
});
