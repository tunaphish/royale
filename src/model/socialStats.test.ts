import { describe, expect, it } from 'vitest';
import { pointsToNextRank, rankOf } from './socialStats';

describe('rankOf', () => {
  it.each([
    [0, 1], [3, 1], [4, 2], [9, 2], [10, 3], [18, 4], [29, 4], [30, 5], [99, 5],
  ])('%i points is rank %i', (points, rank) => {
    expect(rankOf(points)).toBe(rank);
  });
});

describe('pointsToNextRank', () => {
  it('counts down to the next rank, and stops at the top', () => {
    expect(pointsToNextRank(0)).toBe(4);
    expect(pointsToNextRank(12)).toBe(6);
    expect(pointsToNextRank(30)).toBeNull();
  });
});
