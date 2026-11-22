import { describe, expect, it } from 'vitest';
import { describeChange, intelName, slotName } from './schoolText';
import type { SchoolData } from './school';

const DATA: SchoolData = {
  items: { pie: { name: 'Pie', price: 5 } },
  locations: {},
  activities: {},
  students: { rena: { name: 'Rena', schedule: {}, gifts: { loved: [], hated: [] } } },
  stars: { 'rena-1': { student: 'rena', name: 'First words', hint: '', scene: 'rena-1' } },
  events: {},
};
const INTEL = { deck: "{student}'s deck", rules: 'The rules' };

describe('schoolText', () => {
  it('names slots', () => {
    expect(slotName(0)).toBe('Saturday morning');
    expect(slotName(5)).toBe('Monday afternoon');
  });

  it('names intel, filling in the student', () => {
    expect(intelName(DATA, INTEL, 'deck:rena')).toBe("Rena's deck");
    expect(intelName(DATA, INTEL, 'rules')).toBe('The rules');
    expect(intelName(DATA, INTEL, 'unknown')).toBe('unknown');
  });

  it('describes changes', () => {
    const d = (change: Parameters<typeof describeChange>[2]) => describeChange(DATA, INTEL, change);
    expect(d({ kind: 'stat', stat: 'wit', points: 2, rankBefore: 1, rankAfter: 1 })).toBe('Wit +2');
    expect(d({ kind: 'stat', stat: 'wit', points: 2, rankBefore: 1, rankAfter: 2 })).toBe('Wit +2, rank 2!');
    expect(d({ kind: 'disposition', student: 'rena', amount: 1, bandBefore: 'neutral', bandAfter: 'warm' })).toBe('Rena +1, now Warm');
    expect(d({ kind: 'disposition', student: 'rena', amount: -1, bandBefore: 'warm', bandAfter: 'warm' })).toBe('Rena -1');
    expect(d({ kind: 'mood', student: 'rena', mood: 'grateful', slots: 2 })).toBe('Rena is grateful');
    expect(d({ kind: 'gold', amount: -4 })).toBe('Gold -4');
    expect(d({ kind: 'item', item: 'pie', amount: 1 })).toBe('Got: Pie');
    expect(d({ kind: 'item', item: 'pie', amount: -1 })).toBe('Gave away: Pie');
    expect(d({ kind: 'intel', intel: 'deck:rena' })).toBe("Learned: Rena's deck");
    expect(d({ kind: 'loseSlots', times: [5, 6] })).toBe('Lost: Monday afternoon, Tuesday morning');
    expect(d({ kind: 'star', star: 'rena-1' })).toBe('★ First words');
  });
});
