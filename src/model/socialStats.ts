/**
 * Social stats, Persona-style: points raise a stat's rank from 1 to 5.
 * Points are stored in GameState's `stats` (so ink's `stat("nerve")` reads
 * points); ranks are worked out from them.
 */

export const SOCIAL_STATS = ['nerve', 'wit', 'charm'] as const;
export type SocialStat = (typeof SOCIAL_STATS)[number];

export const SOCIAL_STAT_NAMES: Record<SocialStat, string> = {
  nerve: 'Nerve',
  wit: 'Wit',
  charm: 'Charm',
};

export const MAX_RANK = 5;

/** Points needed to reach each rank: rank 1 at 0 points, rank 5 at 30. */
export const RANK_POINTS = [0, 4, 10, 18, 30] as const;

export const rankOf = (points: number): number => {
  let rank = 1;
  while (rank < MAX_RANK && points >= RANK_POINTS[rank]) rank++;
  return rank;
};

/** Points still needed for the next rank, or null at the top rank. */
export const pointsToNextRank = (points: number): number | null => {
  const rank = rankOf(points);
  return rank === MAX_RANK ? null : RANK_POINTS[rank] - points;
};
