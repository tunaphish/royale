import { seededRoll } from './random';

/**
 * Stands in for Friday's royale until it exists: makes up a placement, the
 * ELO and gold that come with it, and a few things that happened with
 * students, so the school has something to react to. Repeatable for a seed
 * and week. Replace with the real royale's results.
 */

export const ROYALE_SIZE = 8;

/** ELO for each placement, 1st to 8th. Placeholder numbers. */
export const PLACEMENT_ELO = [30, 20, 12, 5, -5, -12, -18, -25] as const;

/** What can happen between the player and a student in the stub. */
export const STUB_HISTORY = ['humiliated', 'spared', 'aided'] as const;

export type RoyaleResult = {
  week: number;
  /** 1 is the winner. */
  placement: number;
  elo: number;
  gold: number;
  history: { student: string; event: string }[];
};

export const stubRoyale = (students: readonly string[], seed: number, week: number): RoyaleResult => {
  const placement = 1 + Math.floor(seededRoll(seed, 'royale', week, 'placement') * ROYALE_SIZE);
  const history = students.flatMap((student) => {
    if (seededRoll(seed, 'royale', week, student) >= 0.5) return [];
    const event = STUB_HISTORY[Math.floor(seededRoll(seed, 'royale', week, student, 'event') * STUB_HISTORY.length)];
    return [{ student, event }];
  });
  return {
    week,
    placement,
    elo: PLACEMENT_ELO[placement - 1],
    gold: 25 - 3 * (placement - 1),
    history,
  };
};

export interface RoyaleState {
  addElo(amount: number): void;
  addGold(amount: number): void;
  addHistory(student: string, event: string): void;
  clearIntel(): void;
}

/** Writes a royale's results into the game, and forgets the intel that was about it. */
export const applyRoyale = (state: RoyaleState, result: RoyaleResult): void => {
  state.addElo(result.elo);
  state.addGold(result.gold);
  for (const { student, event } of result.history) state.addHistory(student, event);
  state.clearIntel();
};

/** "1st", "2nd", "3rd", "4th"… */
export const ordinal = (n: number): string => {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${suffix}`;
};
