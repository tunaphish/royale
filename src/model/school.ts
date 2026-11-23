import { calendarAt, slotsToLose, type Day, type Slot } from './calendar';
import { check, studentIntel, type Condition, type ConditionState } from './conditions';
import { dispositionBand, type DispositionBand } from './disposition';
import { pickWeighted, seededRoll } from './random';
import { rankOf, type SocialStat } from './socialStats';

// #region Definitions
// The shapes of the school's content in src/data/. Plain data, never changed at runtime.

/** What an activity, star or event does when it's done. `student` left out means the one involved. */
export type Effect =
  | { kind: 'stat'; stat: SocialStat; points: number }
  | { kind: 'disposition'; student?: string; amount: number }
  /** A mood for this many slots; 0 removes it. */
  | { kind: 'mood'; student?: string; mood: string; slots: number }
  | { kind: 'gold'; amount: number }
  /** Adds (or with a negative amount, takes away) items, like gifts. */
  | { kind: 'item'; item: string; amount: number }
  | { kind: 'flag'; flag: string; value?: boolean }
  /** Learns something about Friday's match. With `ofStudent`, about the student involved: `deck` becomes `deck:rena`. */
  | { kind: 'intel'; intel: string; ofStudent?: boolean }
  /** Takes away the next `count` slots this week (an injury, a detention). */
  | { kind: 'loseSlots'; count: number }
  /** Records something that happened between the player and a student (`humiliated`), as a royale would. */
  | { kind: 'history'; student?: string; event: string };

export type LocationDef = {
  name: string;
  /** Shown on the stage while the player is there: a file in images/backgrounds/, named as in `#bg`. */
  background: string;
  /**
   * The place's lighting while the player is there, and under the scenes that
   * play there: a mood from data/lighting.ts and light FX from data/fx.ts,
   * as `#light` and `#fx` would set them. Flat, with no FX, if left out.
   */
  lighting?: LocationLighting;
  /**
   * An image over the place that frames the character (trees, a doorway), as
   * `#foreground` takes it: a file in images/foregrounds/ or any image key
   * (`layers/forest-foreground`). None, if left out.
   */
  foreground?: string;
  /** When it's open. Always, if left out. */
  open?: Condition;
};

export type LocationLighting = { mood: string; fx?: string[] };

export type ActivityDef = {
  name: string;
  location: string;
  /**
   * `'student'`: done with a student who's here. It's offered once per
   * student present who passes `when`, and its effects and conditions are
   * about that student.
   */
  with?: 'student';
  when?: Condition;
  /** An ink story to play. Effects apply after it ends. */
  scene?: string;
  effects: Effect[];
  /** Doesn't use up the slot (buying something in a shop). */
  free?: boolean;
};

/** Something the player can carry and give: gifts. */
export type ItemDef = {
  name: string;
  /** Gold to buy one. */
  price: number;
};

/** Where a student is in one slot: a location, `null` for off campus, or a weighted choice. */
export type ScheduleEntry = string | null | { location: string | null; weight: number }[];

export type StudentDef = {
  name: string;
  /** Slots left out are off campus. */
  schedule: Partial<Record<Day, Partial<Record<Slot, ScheduleEntry>>>>;
  gifts: { loved: string[]; hated: string[] };
};

/** A constellation star: an authored scene with a student, unlocked by conditions. */
export type StarDef = {
  student: string;
  name: string;
  /** Shown while the star is dim, so the constellation doubles as the quest tracker. */
  hint: string;
  when?: Condition;
  scene: string;
  /**
   * Where the scene is offered. Left out, it's offered wherever the student
   * is. Ignored for `auto` stars.
   */
  location?: string;
  /** Plays by itself at the start of a slot once its conditions hold, like an event. */
  auto?: boolean;
  effects?: Effect[];
};

/** Something that can happen at the start of a day. */
export type EventDef = {
  /** Shown over what it changed, after its scene. */
  name: string;
  scene: string;
  when?: Condition;
  /** Odds against other events that could happen that day. 1 if left out. */
  weight?: number;
  /** Can happen again after it's happened once. */
  repeats?: boolean;
  /**
   * Happens whenever a day starts and its conditions hold, ahead of any
   * random event: for scripted beats like the opening.
   */
  always?: boolean;
  effects?: Effect[];
};

export type SchoolData = {
  items: Record<string, ItemDef>;
  locations: Record<string, LocationDef>;
  activities: Record<string, ActivityDef>;
  students: Record<string, StudentDef>;
  stars: Record<string, StarDef>;
  events: Record<string, EventDef>;
};
// #endregion

// #region Where everyone is

/** Where a student is at `time`, or null when they're off campus. Repeatable for a game's seed. */
export const studentLocation = (
  student: StudentDef,
  studentId: string,
  time: number,
  seed: number,
): string | null => {
  const { day, slot } = calendarAt(time);
  const entry = student.schedule[day]?.[slot];
  if (entry === undefined || entry === null || typeof entry === 'string') return entry ?? null;
  const roll = seededRoll(seed, 'schedule', studentId, time);
  return pickWeighted(entry, (choice) => choice.weight, roll)?.location ?? null;
};

/** Each student's location at `time`, by student ID; off-campus students are left out. */
export const studentLocations = (
  students: SchoolData['students'],
  time: number,
  seed: number,
): Record<string, string> => {
  const where: Record<string, string> = {};
  for (const [id, student] of Object.entries(students)) {
    const location = studentLocation(student, id, time, seed);
    if (location !== null) where[id] = location;
  }
  return where;
};

export const studentsAt = (where: Record<string, string>, location: string): string[] =>
  Object.keys(where).filter((id) => where[id] === location);

export const openLocations = (data: SchoolData, state: ConditionState): string[] =>
  Object.keys(data.locations).filter((id) => check(data.locations[id].open, { state, location: id }));
// #endregion

// #region What the player can do

export type SchoolOption =
  | { kind: 'activity'; activity: string; student?: string }
  | { kind: 'star'; star: string; student: string };

export type StarStatus = 'lit' | 'ready' | 'dim';

export const starStatus = (data: SchoolData, starId: string, state: ConditionState): StarStatus => {
  if (state.hasStar(starId)) return 'lit';
  const star = data.stars[starId];
  return check(star.when, { state, student: star.student }) ? 'ready' : 'dim';
};

/**
 * What the player can do at a location this slot: ready stars first (those
 * that happen here, or wherever their student is), then activities, with
 * student activities offered once per student present.
 */
export const optionsAt = (
  data: SchoolData,
  location: string,
  state: ConditionState,
  where: Record<string, string>,
): SchoolOption[] => {
  const present = studentsAt(where, location);
  const options: SchoolOption[] = [];

  for (const [id, star] of Object.entries(data.stars)) {
    if (star.auto || starStatus(data, id, state) !== 'ready') continue;
    const here = star.location ? star.location === location : where[star.student] === location;
    if (here) options.push({ kind: 'star', star: id, student: star.student });
  }

  for (const [id, activity] of Object.entries(data.activities)) {
    if (activity.location !== location) continue;
    if (activity.with === 'student') {
      for (const student of present) {
        if (check(activity.when, { state, location, student })) {
          options.push({ kind: 'activity', activity: id, student });
        }
      }
    } else if (check(activity.when, { state, location })) {
      options.push({ kind: 'activity', activity: id });
    }
  }
  return options;
};

/** The first `auto` star ready to play, if any. */
export const readyAutoStar = (data: SchoolData, state: ConditionState): string | undefined =>
  Object.keys(data.stars).find((id) => data.stars[id].auto && starStatus(data, id, state) === 'ready');
// #endregion

// #region Events

/** How likely any event is at the start of a day, if some could happen. */
export const DAY_EVENT_CHANCE = 0.4;

/** The flag that marks an event as having happened. */
export const eventFlag = (eventId: string): string => `event:${eventId}`;

/** Events that could happen now: their conditions hold, and they haven't happened unless they repeat. */
export const possibleEvents = (data: SchoolData, state: ConditionState): string[] =>
  Object.keys(data.events).filter((id) => {
    const event = data.events[id];
    return (event.repeats || !state.flag(eventFlag(id))) && check(event.when, { state });
  });

/** The first `always` event that could happen now: scripted beats, which don't need a roll. */
export const scriptedEvent = (data: SchoolData, state: ConditionState): string | undefined =>
  possibleEvents(data, state).find((id) => data.events[id].always);

/**
 * The event that happens at the start of a day, or undefined for none: a
 * scripted (`always`) event if one can happen, else maybe a random one.
 * `rolls` are two rolls in [0, 1): whether anything happens, then which.
 */
export const pickDayEvent = (
  data: SchoolData,
  state: ConditionState,
  rolls: [number, number],
  chance = DAY_EVENT_CHANCE,
): string | undefined => {
  const scripted = scriptedEvent(data, state);
  if (scripted) return scripted;
  if (rolls[0] >= chance) return undefined;
  const random = possibleEvents(data, state).filter((id) => !data.events[id].always);
  return pickWeighted(random, (id) => data.events[id].weight ?? 1, rolls[1]);
};
// #endregion

// #region Effects

/** What effects change. `GameState` has all of it. */
export interface EffectState extends ConditionState {
  readonly calendar: { readonly time: number; readonly lostSlots: readonly number[] };
  addStat(name: string, amount: number): void;
  addDisposition(student: string, amount: number): void;
  setMood(student: string, mood: string, slots: number): void;
  addGold(amount: number): void;
  addItem(item: string, amount: number): void;
  setFlag(name: string, value: boolean): void;
  learnIntel(intel: string): void;
  loseSlots(times: number[]): void;
  lightStar(star: string): void;
  addHistory(student: string, event: string): void;
}

/** What an effect did, for the results screen. */
export type Change =
  | { kind: 'stat'; stat: SocialStat; points: number; rankBefore: number; rankAfter: number }
  | { kind: 'disposition'; student: string; amount: number; bandBefore: DispositionBand; bandAfter: DispositionBand }
  | { kind: 'mood'; student: string; mood: string; slots: number }
  | { kind: 'gold'; amount: number }
  | { kind: 'item'; item: string; amount: number }
  | { kind: 'intel'; intel: string }
  | { kind: 'loseSlots'; times: number[] }
  | { kind: 'star'; star: string }
  | { kind: 'history'; student: string; event: string };

/**
 * Applies effects to the game state and says what changed. Flags change
 * silently. Effects about a student that name nobody, with no `student` given,
 * are skipped with a warning.
 */
export const applyEffects = (state: EffectState, effects: readonly Effect[], student?: string): Change[] => {
  const changes: Change[] = [];
  const studentOf = (named?: string) => {
    const resolved = named ?? student;
    if (!resolved) console.warn('[school] an effect needs a student, but none is involved');
    return resolved;
  };

  for (const effect of effects) {
    switch (effect.kind) {
      case 'stat': {
        const rankBefore = rankOf(state.stat(effect.stat));
        state.addStat(effect.stat, effect.points);
        changes.push({ ...effect, rankBefore, rankAfter: rankOf(state.stat(effect.stat)) });
        break;
      }
      case 'disposition': {
        const who = studentOf(effect.student);
        if (!who) break;
        const bandBefore = dispositionBand(state.disposition(who));
        state.addDisposition(who, effect.amount);
        changes.push({ kind: 'disposition', student: who, amount: effect.amount, bandBefore, bandAfter: dispositionBand(state.disposition(who)) });
        break;
      }
      case 'mood': {
        const who = studentOf(effect.student);
        if (!who) break;
        state.setMood(who, effect.mood, effect.slots);
        changes.push({ kind: 'mood', student: who, mood: effect.mood, slots: effect.slots });
        break;
      }
      case 'gold':
        state.addGold(effect.amount);
        changes.push(effect);
        break;
      case 'item':
        state.addItem(effect.item, effect.amount);
        changes.push(effect);
        break;
      case 'flag':
        state.setFlag(effect.flag, effect.value ?? true);
        break;
      case 'intel': {
        let intel = effect.intel;
        if (effect.ofStudent) {
          const who = studentOf();
          if (!who) break;
          intel = studentIntel(effect.intel, who);
        }
        if (state.knowsIntel(intel)) break;
        state.learnIntel(intel);
        changes.push({ kind: 'intel', intel });
        break;
      }
      case 'history': {
        const who = studentOf(effect.student);
        if (!who) break;
        state.addHistory(who, effect.event);
        changes.push({ kind: 'history', student: who, event: effect.event });
        break;
      }
      case 'loseSlots': {
        const times = slotsToLose(state.calendar.time, effect.count, state.calendar.lostSlots);
        if (times.length === 0) break;
        state.loseSlots(times);
        changes.push({ kind: 'loseSlots', times });
        break;
      }
    }
  }
  return changes;
};

/** A gift's effect on a student: loved +2, hated -2, anything else +1. */
export const giftEffect = (student: StudentDef, item: string): number =>
  student.gifts.loved.includes(item) ? 2 : student.gifts.hated.includes(item) ? -2 : 1;

/** Gives a student one of an item the player has: it's used up and moves their disposition. */
export const giveGift = (data: SchoolData, state: EffectState & { items(item: string): number }, student: string, item: string): Change[] => {
  if (state.items(item) < 1) return [];
  return applyEffects(state, [
    { kind: 'item', item, amount: -1 },
    { kind: 'disposition', amount: giftEffect(data.students[student], item) },
  ], student);
};
// #endregion

// #region Scenes

/** A scene the School scene sent the player to, so it can finish it when the story ends. */
export type PlayedScene =
  | { kind: 'star'; star: string }
  | { kind: 'activity'; activity: string; student?: string }
  | { kind: 'event'; event: string };

/** The story a played scene runs, if any. */
export const sceneStory = (data: SchoolData, played: PlayedScene): string | undefined => {
  switch (played.kind) {
    case 'star':
      return data.stars[played.star].scene;
    case 'activity':
      return data.activities[played.activity].scene;
    case 'event':
      return data.events[played.event].scene;
  }
};

/**
 * Whether playing it uses up the slot. Stars and activities picked from a
 * location do; events and `auto` stars happen on their own and don't.
 */
export const usesSlot = (data: SchoolData, played: PlayedScene): boolean =>
  played.kind === 'activity' || (played.kind === 'star' && !data.stars[played.star].auto);

/**
 * What finishing a scene does: lights its star or marks its event as having
 * happened, then applies its effects. Returns what changed, star first.
 */
export const finishScene = (data: SchoolData, state: EffectState, played: PlayedScene): Change[] => {
  switch (played.kind) {
    case 'star': {
      const star = data.stars[played.star];
      state.lightStar(played.star);
      return [{ kind: 'star', star: played.star }, ...applyEffects(state, star.effects ?? [], star.student)];
    }
    case 'activity':
      return applyEffects(state, data.activities[played.activity].effects, played.student);
    case 'event':
      state.setFlag(eventFlag(played.event), true);
      return applyEffects(state, data.events[played.event].effects ?? []);
  }
};
// #endregion
