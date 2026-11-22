import { describe, expect, it } from 'vitest';
import { constellationLayout, requiredStars } from './constellation';
import { when } from './conditions';
import { SCHOOL } from '../data/school';
import type { SchoolData } from './school';

const DATA: SchoolData = {
  items: {},
  locations: {},
  activities: {},
  students: { rena: { name: 'Rena', schedule: {}, gifts: { loved: [], hated: [] } } },
  stars: {
    a: { student: 'rena', name: 'A', hint: '', scene: 'a' },
    b: { student: 'rena', name: 'B', hint: '', scene: 'b', when: when.all(when.star('a'), when.rank('wit', 2)) },
    c: { student: 'rena', name: 'C', hint: '', scene: 'c', when: when.star('a') },
    d: { student: 'rena', name: 'D', hint: '', scene: 'd', when: when.all(when.star('b'), when.not(when.star('c'))) },
  },
  events: {},
};

describe('requiredStars', () => {
  it('finds stars a condition needs, not ones it forbids', () => {
    expect(requiredStars(DATA.stars.d.when)).toEqual(['b']);
    expect(requiredStars(undefined)).toEqual([]);
  });
});

describe('constellationLayout', () => {
  it('links the player to students, students to first stars, and stars to what they need', () => {
    const { edges } = constellationLayout(DATA);
    expect(edges).toEqual(expect.arrayContaining([
      { from: 'player', to: 'rena' },
      { from: 'rena', to: 'a' },
      { from: 'a', to: 'b' },
      { from: 'a', to: 'c' },
      { from: 'b', to: 'd' },
    ]));
    expect(edges).toHaveLength(5);
  });

  it('puts deeper stars further out', () => {
    const { nodes } = constellationLayout(DATA);
    const r = (id: string) => {
      const node = nodes.find((n) => n.id === id)!;
      return Math.hypot(node.x, node.y);
    };
    expect(r('rena')).toBeLessThan(r('a'));
    expect(r('a')).toBeLessThan(r('b'));
    expect(r('b')).toBeCloseTo(r('c'));
    expect(r('b')).toBeLessThan(r('d'));
  });

  it('places every star of the real data inside the view', () => {
    const { nodes } = constellationLayout(SCHOOL);
    expect(nodes.filter((n) => n.kind === 'star')).toHaveLength(Object.keys(SCHOOL.stars).length);
    for (const node of nodes) {
      expect(Math.abs(node.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(node.y)).toBeLessThanOrEqual(1);
    }
  });
});
