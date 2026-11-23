import { describe, expect, it, vi } from 'vitest';
import { GameState } from '../state/gameState';
import { newGameState } from '../data/new-game';
import { timeOf } from './calendar';
import { when } from './conditions';
import { seededRoll } from './random';
import {
  applyEffects, eventFlag, scriptedEvent, finishScene, giftEffect, giveGift, sceneStory, usesSlot, openLocations, optionsAt, pickDayEvent, possibleEvents,
  readyAutoStar, starStatus, studentLocation, studentLocations, type SchoolData,
} from './school';

const DATA: SchoolData = {
  items: { pie: { name: 'Pie', price: 5 } },
  locations: {
    cafeteria: { name: 'Cafeteria', background: 'bg' },
    library: { name: 'Library', background: 'bg' },
    town: { name: 'Town', background: 'bg', open: when.weekend() },
  },
  activities: {
    study: { name: 'Study', location: 'library', effects: [{ kind: 'stat', stat: 'wit', points: 2 }] },
    hangout: {
      name: 'Hang out',
      location: 'cafeteria',
      with: 'student',
      when: when.not(when.bandAtMost('cold')),
      effects: [{ kind: 'disposition', amount: 1 }],
    },
  },
  students: {
    rena: {
      name: 'Rena',
      schedule: { sat: { morning: 'cafeteria', afternoon: [{ location: 'library', weight: 1 }, { location: null, weight: 1 }] } },
      gifts: { loved: ['pie'], hated: ['onion'] },
    },
    thief: { name: 'The Thief', schedule: { sat: { morning: 'cafeteria' } }, gifts: { loved: [], hated: [] } },
  },
  stars: {
    'rena-1': { student: 'rena', name: 'First words', hint: '', scene: 'rena-1' },
    'rena-2': { student: 'rena', name: 'Study date', hint: '', scene: 'rena-2', location: 'library', when: when.star('rena-1') },
    'thief-1': { student: 'thief', name: 'Grudge', hint: '', scene: 'thief-1', auto: true, when: when.history('humiliated') },
  },
  events: {
    rain: { name: 'Rain', scene: 'rain' },
    fair: { name: 'Fair', scene: 'fair', when: when.weekday(), weight: 3 },
    bell: { name: 'Bell', scene: 'bell', repeats: true },
  },
};

const fresh = () => new GameState(newGameState());

describe('schedules', () => {
  it('places students by their schedule, off campus where it says nothing', () => {
    expect(studentLocation(DATA.students.rena, 'rena', timeOf(1, 'sat', 'morning'), 1)).toBe('cafeteria');
    expect(studentLocation(DATA.students.thief, 'thief', timeOf(1, 'sat', 'afternoon'), 1)).toBeNull();
    expect(studentLocations(DATA.students, 0, 1)).toEqual({ rena: 'cafeteria', thief: 'cafeteria' });
  });

  it('picks weighted entries the same way every time for a seed', () => {
    const time = timeOf(1, 'sat', 'afternoon');
    const results = new Set<string | null>();
    for (let seed = 0; seed < 50; seed++) {
      const first = studentLocation(DATA.students.rena, 'rena', time, seed);
      expect(studentLocation(DATA.students.rena, 'rena', time, seed)).toBe(first);
      results.add(first);
    }
    expect(results).toEqual(new Set(['library', null]));
  });
});

describe('seededRoll', () => {
  it('is repeatable, in [0, 1), and differs by key', () => {
    expect(seededRoll(5, 'a', 1)).toBe(seededRoll(5, 'a', 1));
    expect(seededRoll(5, 'a', 1)).not.toBe(seededRoll(5, 'a', 2));
    for (let i = 0; i < 200; i++) {
      const roll = seededRoll(i, 'x');
      expect(roll).toBeGreaterThanOrEqual(0);
      expect(roll).toBeLessThan(1);
    }
  });
});

describe('openLocations', () => {
  it('opens town on weekends only', () => {
    const state = fresh();
    expect(openLocations(DATA, state)).toEqual(['cafeteria', 'library', 'town']);
    state.setTime(timeOf(1, 'mon', 'morning'));
    expect(openLocations(DATA, state)).toEqual(['cafeteria', 'library']);
  });
});

describe('optionsAt', () => {
  const where = { rena: 'cafeteria', thief: 'cafeteria' };

  it('offers student activities once per student who qualifies', () => {
    const state = fresh();
    state.addDisposition('thief', -3);
    expect(optionsAt(DATA, 'cafeteria', state, where)).toEqual([
      { kind: 'star', star: 'rena-1', student: 'rena' },
      { kind: 'activity', activity: 'hangout', student: 'rena' },
    ]);
  });

  it('offers stars where they happen, or where their student is', () => {
    const state = fresh();
    state.lightStar('rena-1');
    expect(optionsAt(DATA, 'library', state, where)).toEqual([
      { kind: 'star', star: 'rena-2', student: 'rena' },
      { kind: 'activity', activity: 'study' },
    ]);
    expect(optionsAt(DATA, 'cafeteria', state, where)).toEqual([
      { kind: 'activity', activity: 'hangout', student: 'rena' },
      { kind: 'activity', activity: 'hangout', student: 'thief' },
    ]);
  });
});

describe('stars', () => {
  it('are dim, ready, then lit', () => {
    const state = fresh();
    expect(starStatus(DATA, 'rena-2', state)).toBe('dim');
    state.lightStar('rena-1');
    expect(starStatus(DATA, 'rena-2', state)).toBe('ready');
    state.lightStar('rena-2');
    expect(starStatus(DATA, 'rena-2', state)).toBe('lit');
  });

  it('finds auto stars that are ready, and not elsewhere', () => {
    const state = fresh();
    expect(readyAutoStar(DATA, state)).toBeUndefined();
    state.addHistory('thief', 'humiliated');
    expect(readyAutoStar(DATA, state)).toBe('thief-1');
    expect(optionsAt(DATA, 'cafeteria', state, { thief: 'cafeteria' })).not.toContainEqual(
      expect.objectContaining({ star: 'thief-1' }),
    );
  });
});

describe('events', () => {
  it('only offers events whose conditions hold and that have not happened', () => {
    const state = fresh();
    expect(possibleEvents(DATA, state)).toEqual(['rain', 'bell']);
    state.setFlag(eventFlag('rain'), true);
    state.setFlag(eventFlag('bell'), true);
    expect(possibleEvents(DATA, state)).toEqual(['bell']);
  });

  it('picks nothing above the chance, else by weight', () => {
    const state = fresh();
    state.setTime(timeOf(1, 'mon', 'morning'));
    expect(pickDayEvent(DATA, state, [0.5, 0], 0.4)).toBeUndefined();
    // rain 1, fair 3, bell 1: rolls split 0-0.2, 0.2-0.8, 0.8-1
    expect(pickDayEvent(DATA, state, [0.1, 0.1], 0.4)).toBe('rain');
    expect(pickDayEvent(DATA, state, [0.1, 0.5], 0.4)).toBe('fair');
    expect(pickDayEvent(DATA, state, [0.1, 0.9], 0.4)).toBe('bell');
  });
});

describe('scripted events', () => {
  const data: SchoolData = {
    ...DATA,
    events: { ...DATA.events, opening: { name: 'Opening', scene: 'opening', always: true, when: when.week(1) } },
  };

  it('happen without a roll, ahead of random events, until they have happened', () => {
    const state = fresh();
    expect(scriptedEvent(data, state)).toBe('opening');
    expect(pickDayEvent(data, state, [0.99, 0])).toBe('opening');
    state.setFlag(eventFlag('opening'), true);
    expect(pickDayEvent(data, state, [0.1, 0.1])).toBe('rain');
  });
});

describe('applyEffects', () => {
  it('changes the state and reports rank and band changes', () => {
    const state = fresh();
    state.addStat('wit', 3);
    state.addDisposition('rena', 1);
    const changes = applyEffects(state, [
      { kind: 'stat', stat: 'wit', points: 2 },
      { kind: 'disposition', amount: 1 },
      { kind: 'mood', mood: 'grateful', slots: 2 },
      { kind: 'gold', amount: 5 },
      { kind: 'item', item: 'pie', amount: 1 },
      { kind: 'flag', flag: 'helped' },
      { kind: 'intel', intel: 'rules' },
    ], 'rena');

    expect(changes).toEqual([
      { kind: 'stat', stat: 'wit', points: 2, rankBefore: 1, rankAfter: 2 },
      { kind: 'disposition', student: 'rena', amount: 1, bandBefore: 'neutral', bandAfter: 'warm' },
      { kind: 'mood', student: 'rena', mood: 'grateful', slots: 2 },
      { kind: 'gold', amount: 5 },
      { kind: 'item', item: 'pie', amount: 1 },
      { kind: 'intel', intel: 'rules' },
    ]);
    expect(state.flag('helped')).toBe(true);
    expect(state.items('pie')).toBe(1);
  });

  it('records history for the student involved', () => {
    const state = fresh();
    expect(applyEffects(state, [{ kind: 'history', event: 'spared' }], 'rena')).toEqual([
      { kind: 'history', student: 'rena', event: 'spared' },
    ]);
    expect(state.hasHistory('rena', 'spared')).toBe(true);
  });

  it('loses the next slots of the week', () => {
    const state = fresh();
    state.setTime(9);
    expect(applyEffects(state, [{ kind: 'loseSlots', count: 3 }])).toEqual([{ kind: 'loseSlots', times: [10, 11] }]);
    expect(state.calendar.lostSlots).toEqual([10, 11]);
  });

  it('skips student effects with no student, with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const state = fresh();
    expect(applyEffects(state, [{ kind: 'disposition', amount: 1 }])).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('names intel after the student involved', () => {
    const state = fresh();
    expect(applyEffects(state, [{ kind: 'intel', intel: 'deck', ofStudent: true }], 'thief')).toEqual([
      { kind: 'intel', intel: 'deck:thief' },
    ]);
    expect(state.knowsIntel('deck:thief')).toBe(true);
  });

  it('does not report intel already known', () => {
    const state = fresh();
    state.learnIntel('rules');
    expect(applyEffects(state, [{ kind: 'intel', intel: 'rules' }])).toEqual([]);
  });
});

describe('giftEffect', () => {
  it('is +2 loved, -2 hated, +1 otherwise', () => {
    const rena = DATA.students.rena;
    expect(giftEffect(rena, 'pie')).toBe(2);
    expect(giftEffect(rena, 'onion')).toBe(-2);
    expect(giftEffect(rena, 'tea')).toBe(1);
  });
});

describe('giveGift', () => {
  it('uses up the item and moves disposition', () => {
    const state = fresh();
    state.addItem('pie', 1);
    expect(giveGift(DATA, state, 'rena', 'pie')).toEqual([
      { kind: 'item', item: 'pie', amount: -1 },
      { kind: 'disposition', student: 'rena', amount: 2, bandBefore: 'neutral', bandAfter: 'warm' },
    ]);
    expect(state.items('pie')).toBe(0);
    expect(giveGift(DATA, state, 'rena', 'pie')).toEqual([]);
  });
});

describe('scenes', () => {
  it('finds the story a scene plays, and whether it uses the slot', () => {
    expect(sceneStory(DATA, { kind: 'star', star: 'rena-1' })).toBe('rena-1');
    expect(sceneStory(DATA, { kind: 'event', event: 'rain' })).toBe('rain');
    expect(sceneStory(DATA, { kind: 'activity', activity: 'study' })).toBeUndefined();
    expect(usesSlot(DATA, { kind: 'star', star: 'rena-1' })).toBe(true);
    expect(usesSlot(DATA, { kind: 'star', star: 'thief-1' })).toBe(false);
    expect(usesSlot(DATA, { kind: 'event', event: 'rain' })).toBe(false);
    expect(usesSlot(DATA, { kind: 'activity', activity: 'study' })).toBe(true);
  });

  it('lights a star and applies its effects for its student', () => {
    const data: SchoolData = {
      ...DATA,
      stars: { ...DATA.stars, 'rena-1': { ...DATA.stars['rena-1'], effects: [{ kind: 'disposition', amount: 2 }] } },
    };
    const state = fresh();
    expect(finishScene(data, state, { kind: 'star', star: 'rena-1' })).toEqual([
      { kind: 'star', star: 'rena-1' },
      { kind: 'disposition', student: 'rena', amount: 2, bandBefore: 'neutral', bandAfter: 'warm' },
    ]);
    expect(state.hasStar('rena-1')).toBe(true);
  });

  it('marks an event as having happened', () => {
    const data: SchoolData = { ...DATA, events: { ...DATA.events, rain: { ...DATA.events.rain, effects: [{ kind: 'gold', amount: 3 }] } } };
    const state = fresh();
    expect(finishScene(data, state, { kind: 'event', event: 'rain' })).toEqual([{ kind: 'gold', amount: 3 }]);
    expect(possibleEvents(data, state)).not.toContain('rain');
  });

  it('applies an activity for its student', () => {
    const state = fresh();
    expect(finishScene(DATA, state, { kind: 'activity', activity: 'hangout', student: 'thief' })).toEqual([
      { kind: 'disposition', student: 'thief', amount: 1, bandBefore: 'neutral', bandAfter: 'neutral' },
    ]);
  });
});
