import { calendarAt, type Day, type Slot } from './calendar';
import { DISPOSITION_BANDS, dispositionBand, type DispositionBand } from './disposition';
import { rankOf, type SocialStat } from './socialStats';

/**
 * One condition language for everything in the school that can be locked:
 * activities, constellation stars, events. Conditions are plain data, so they
 * can sit in `src/data/` next to what they lock.
 *
 * `student` is optional where a student is involved: left out, it means the
 * student the condition is being checked for (the one you'd hang out with,
 * the star's student).
 */
export type Condition =
  /** A social stat at this rank or higher. */
  | { kind: 'rank'; stat: SocialStat; atLeast: number }
  /** A student's disposition band, within `atLeast`..`atMost` (either may be left out). */
  | { kind: 'band'; student?: string; atLeast?: DispositionBand; atMost?: DispositionBand }
  | { kind: 'mood'; student?: string; mood: string }
  /** A lit constellation star. */
  | { kind: 'star'; star: string }
  /** Something that happened in a royale (`humiliated`, `spared`). */
  | { kind: 'history'; student?: string; event: string }
  /** A flag, true unless `is` says otherwise. */
  | { kind: 'flag'; flag: string; is?: boolean }
  /** Known intel. With `ofStudent`, about the student involved: `deck` means `deck:rena`. */
  | { kind: 'intel'; intel: string; ofStudent?: boolean }
  | { kind: 'gold'; atLeast: number }
  | { kind: 'day'; days: Day[] }
  | { kind: 'slot'; slot: Slot }
  | { kind: 'weekend' }
  | { kind: 'week'; atLeast: number }
  /** The player is at this location. */
  | { kind: 'at'; location: string }
  | { kind: 'all'; all: Condition[] }
  | { kind: 'any'; any: Condition[] }
  | { kind: 'not'; not: Condition };

/** What conditions read. `GameState` has all of it. */
export interface ConditionState {
  readonly gold: number;
  readonly calendar: { readonly time: number };
  stat(name: string): number;
  flag(name: string): boolean;
  disposition(student: string): number;
  hasMood(student: string, mood: string): boolean;
  hasStar(star: string): boolean;
  hasHistory(student: string, event: string): boolean;
  knowsIntel(intel: string): boolean;
}

export type ConditionContext = {
  state: ConditionState;
  /** Where the player is, for `at`. */
  location?: string;
  /** The student a condition is about when it doesn't name one. */
  student?: string;
};

/** The ID of intel about one student: `deck:rena`. */
export const studentIntel = (intel: string, student: string): string => `${intel}:${student}`;

const bandIndex = (band: DispositionBand) => DISPOSITION_BANDS.indexOf(band);

/** True if the condition holds. Missing conditions hold. */
export const check = (condition: Condition | undefined, context: ConditionContext): boolean => {
  if (!condition) return true;
  const { state } = context;
  const studentOf = (student?: string) => student ?? context.student;

  switch (condition.kind) {
    case 'rank':
      return rankOf(state.stat(condition.stat)) >= condition.atLeast;
    case 'band': {
      const student = studentOf(condition.student);
      if (!student) return false;
      const band = bandIndex(dispositionBand(state.disposition(student)));
      return (
        (condition.atLeast === undefined || band >= bandIndex(condition.atLeast)) &&
        (condition.atMost === undefined || band <= bandIndex(condition.atMost))
      );
    }
    case 'mood': {
      const student = studentOf(condition.student);
      return !!student && state.hasMood(student, condition.mood);
    }
    case 'star':
      return state.hasStar(condition.star);
    case 'history': {
      const student = studentOf(condition.student);
      return !!student && state.hasHistory(student, condition.event);
    }
    case 'flag':
      return state.flag(condition.flag) === (condition.is ?? true);
    case 'intel': {
      if (!condition.ofStudent) return state.knowsIntel(condition.intel);
      const student = studentOf();
      return !!student && state.knowsIntel(studentIntel(condition.intel, student));
    }
    case 'gold':
      return state.gold >= condition.atLeast;
    case 'day':
      return condition.days.includes(calendarAt(state.calendar.time).day);
    case 'slot':
      return calendarAt(state.calendar.time).slot === condition.slot;
    case 'weekend':
      return calendarAt(state.calendar.time).weekend;
    case 'week':
      return calendarAt(state.calendar.time).week >= condition.atLeast;
    case 'at':
      return context.location === condition.location;
    case 'all':
      return condition.all.every((c) => check(c, context));
    case 'any':
      return condition.any.some((c) => check(c, context));
    case 'not':
      return !check(condition.not, context);
  }
};

/** Short ways to write conditions in data files: `when.all(when.rank('wit', 2), when.band('warm'))`. */
export const when = {
  rank: (stat: SocialStat, atLeast: number): Condition => ({ kind: 'rank', stat, atLeast }),
  /** At least this band with the condition's student, or `student`. */
  band: (atLeast: DispositionBand, student?: string): Condition => ({ kind: 'band', student, atLeast }),
  /** At most this band with the condition's student, or `student`. */
  bandAtMost: (atMost: DispositionBand, student?: string): Condition => ({ kind: 'band', student, atMost }),
  mood: (mood: string, student?: string): Condition => ({ kind: 'mood', student, mood }),
  star: (star: string): Condition => ({ kind: 'star', star }),
  history: (event: string, student?: string): Condition => ({ kind: 'history', student, event }),
  flag: (flag: string, is = true): Condition => ({ kind: 'flag', flag, is }),
  intel: (intel: string): Condition => ({ kind: 'intel', intel }),
  /** Known intel about the condition's student: `when.studentIntel('deck')` is `deck:<student>`. */
  studentIntel: (intel: string): Condition => ({ kind: 'intel', intel, ofStudent: true }),
  gold: (atLeast: number): Condition => ({ kind: 'gold', atLeast }),
  day: (...days: Day[]): Condition => ({ kind: 'day', days }),
  slot: (slot: Slot): Condition => ({ kind: 'slot', slot }),
  weekend: (): Condition => ({ kind: 'weekend' }),
  weekday: (): Condition => ({ kind: 'not', not: { kind: 'weekend' } }),
  week: (atLeast: number): Condition => ({ kind: 'week', atLeast }),
  at: (location: string): Condition => ({ kind: 'at', location }),
  all: (...all: Condition[]): Condition => ({ kind: 'all', all }),
  any: (...any: Condition[]): Condition => ({ kind: 'any', any }),
  not: (not: Condition): Condition => ({ kind: 'not', not }),
};
