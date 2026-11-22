/**
 * The school week. Time is counted in slots: two a day (morning, afternoon),
 * Saturday to Thursday, so 12 a week. Friday is the royale and has no slots.
 * Time 0 is the first Saturday morning.
 */

export const DAYS = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu'] as const;
export type Day = (typeof DAYS)[number];

export const SLOTS = ['morning', 'afternoon'] as const;
export type Slot = (typeof SLOTS)[number];

export const SLOTS_PER_DAY = SLOTS.length;
export const SLOTS_PER_WEEK = DAYS.length * SLOTS_PER_DAY;

export const DAY_NAMES: Record<Day, string> = {
  sat: 'Saturday',
  sun: 'Sunday',
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
};

export const WEEKEND: readonly Day[] = ['sat', 'sun'];

/** Where a time falls in the calendar. */
export type CalendarTime = {
  time: number;
  /** 1 for the first week. */
  week: number;
  day: Day;
  slot: Slot;
  weekend: boolean;
  /** True for the first slot of a day, when the day's event is checked. */
  dayStart: boolean;
  /** True for Thursday afternoon; the royale comes after it. */
  lastOfWeek: boolean;
};

export const calendarAt = (time: number): CalendarTime => {
  const inWeek = time % SLOTS_PER_WEEK;
  const day = DAYS[Math.floor(inWeek / SLOTS_PER_DAY)];
  const slotIndex = inWeek % SLOTS_PER_DAY;
  return {
    time,
    week: Math.floor(time / SLOTS_PER_WEEK) + 1,
    day,
    slot: SLOTS[slotIndex],
    weekend: WEEKEND.includes(day),
    dayStart: slotIndex === 0,
    lastOfWeek: inWeek === SLOTS_PER_WEEK - 1,
  };
};

export const timeOf = (week: number, day: Day, slot: Slot): number =>
  (week - 1) * SLOTS_PER_WEEK + DAYS.indexOf(day) * SLOTS_PER_DAY + SLOTS.indexOf(slot);

export const weekOf = (time: number): number => Math.floor(time / SLOTS_PER_WEEK) + 1;

/** The first slot of the week after `time`'s, i.e. the Saturday morning after the royale. */
export const nextWeekStart = (time: number): number => weekOf(time) * SLOTS_PER_WEEK;

export type Advance = {
  /** The next slot the player gets to play. */
  time: number;
  /** Lost slots that were skipped on the way, in order. */
  skipped: number[];
  /** True if Friday's royale comes before `time`. */
  royale: boolean;
};

/**
 * What comes after the current slot: the next slot that isn't lost, skipping
 * lost ones, and whether the week ran out first. When it does, `time` is the
 * next week's first playable slot, though the royale has to happen before it.
 */
export const advance = (time: number, lostSlots: readonly number[]): Advance => {
  const week = weekOf(time);
  const skipped: number[] = [];
  let next = time + 1;
  while (lostSlots.includes(next)) {
    skipped.push(next);
    next++;
  }
  return { time: next, skipped, royale: weekOf(next) > week };
};

/**
 * The `count` slots after `time` that aren't already lost, up to Thursday
 * afternoon: what an injury or event takes away. Never reaches past the royale.
 */
export const slotsToLose = (time: number, count: number, lostSlots: readonly number[]): number[] => {
  const lastOfWeek = weekOf(time) * SLOTS_PER_WEEK - 1;
  const lost: number[] = [];
  for (let next = time + 1; next <= lastOfWeek && lost.length < count; next++) {
    if (!lostSlots.includes(next)) lost.push(next);
  }
  return lost;
};
