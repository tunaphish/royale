import type { Condition } from './conditions';
import { requiredStars } from './constellation';
import { MAX_RANK, SOCIAL_STATS } from './socialStats';
import type { Effect, SchoolData, ScheduleEntry } from './school';
import { FX } from '../data/fx';
import { LIGHTING } from '../data/lighting';

/**
 * Checks what TypeScript can't in the school's data: every ID it mentions
 * (students, locations, stars, items, stories, moods, FX) exists, and numbers make
 * sense. Returns one line per problem. Boot throws if there are any.
 * `imageKeys` are the images that exist (`backgrounds/forest`), for backgrounds and foregrounds.
 */
export const checkSchoolData = (data: SchoolData, storyKeys: readonly string[], imageKeys: readonly string[]): string[] => {
  const problems: string[] = [];
  const exists = (where: string, what: string, id: string, table: Record<string, unknown>) => {
    if (!(id in table)) problems.push(`${where}: no ${what} "${id}"`);
  };
  const story = (where: string, key: string) => {
    if (!storyKeys.includes(key)) problems.push(`${where}: no story "${key}" (add scripts/stories/${key}.ink)`);
  };

  /** `student` is whether a student is involved, for conditions that leave theirs out. */
  const condition = (where: string, c: Condition | undefined, student: boolean): void => {
    if (!c) return;
    const studentRef = (named?: string) => {
      if (named) exists(where, 'student', named, data.students);
      else if (!student) problems.push(`${where}: "${c.kind}" condition needs a student; none is involved here`);
    };
    switch (c.kind) {
      case 'rank':
        if (!(SOCIAL_STATS as readonly string[]).includes(c.stat)) problems.push(`${where}: no social stat "${c.stat}"`);
        if (c.atLeast < 1 || c.atLeast > MAX_RANK) problems.push(`${where}: rank must be 1-${MAX_RANK}`);
        break;
      case 'band':
        studentRef(c.student);
        if (!c.atLeast && !c.atMost) problems.push(`${where}: band condition needs atLeast or atMost`);
        break;
      case 'mood':
      case 'history':
        studentRef(c.student);
        break;
      case 'intel':
        if (c.ofStudent) studentRef();
        break;
      case 'star':
        exists(where, 'star', c.star, data.stars);
        break;
      case 'at':
        exists(where, 'location', c.location, data.locations);
        break;
      case 'all':
        c.all.forEach((inner) => condition(where, inner, student));
        break;
      case 'any':
        c.any.forEach((inner) => condition(where, inner, student));
        break;
      case 'not':
        condition(where, c.not, student);
        break;
    }
  };

  const effects = (where: string, list: readonly Effect[] | undefined, student: boolean): void => {
    for (const effect of list ?? []) {
      const studentRef = (named?: string) => {
        if (named) exists(where, 'student', named, data.students);
        else if (!student) problems.push(`${where}: "${effect.kind}" effect needs a student; none is involved here`);
      };
      switch (effect.kind) {
        case 'stat':
          if (!(SOCIAL_STATS as readonly string[]).includes(effect.stat)) problems.push(`${where}: no social stat "${effect.stat}"`);
          break;
        case 'disposition':
        case 'mood':
        case 'history':
          studentRef(effect.student);
          break;
        case 'intel':
          if (effect.ofStudent) studentRef();
          break;
        case 'item':
          exists(where, 'item', effect.item, data.items);
          break;
        case 'loseSlots':
          if (effect.count < 1) problems.push(`${where}: loseSlots count must be at least 1`);
          break;
      }
    }
  };

  const schedule = (where: string, entry: ScheduleEntry | undefined) => {
    if (entry === undefined || entry === null) return;
    if (typeof entry === 'string') return exists(where, 'location', entry, data.locations);
    if (entry.length === 0) problems.push(`${where}: empty choice`);
    for (const choice of entry) {
      if (choice.location !== null) exists(where, 'location', choice.location, data.locations);
      if (choice.weight <= 0) problems.push(`${where}: weights must be > 0`);
    }
  };

  for (const [id, location] of Object.entries(data.locations)) {
    condition(`location "${id}"`, location.open, false);
    if (!imageKeys.includes(`backgrounds/${location.background}`)) {
      problems.push(`location "${id}": no background "${location.background}" (put it in src/assets/images/backgrounds/)`);
    }
    if (location.foreground) {
      const key = location.foreground;
      if (!imageKeys.includes(`foregrounds/${key}`) && !imageKeys.includes(key)) {
        problems.push(`location "${id}": no foreground "${key}" (in images/foregrounds/, or any image key)`);
      }
    }
    if (location.lighting) {
      exists(`location "${id}"`, 'mood', location.lighting.mood, LIGHTING);
      location.lighting.fx?.forEach((fx) => exists(`location "${id}"`, 'FX', fx, FX));
    }
  }

  for (const [id, item] of Object.entries(data.items)) {
    if (item.price < 0) problems.push(`item "${id}": price can't be negative`);
  }

  for (const [id, activity] of Object.entries(data.activities)) {
    const where = `activity "${id}"`;
    const withStudent = activity.with === 'student';
    exists(where, 'location', activity.location, data.locations);
    condition(where, activity.when, withStudent);
    effects(where, activity.effects, withStudent);
    if (activity.scene) story(where, activity.scene);
  }

  for (const [id, student] of Object.entries(data.students)) {
    for (const [day, slots] of Object.entries(student.schedule)) {
      for (const [slot, entry] of Object.entries(slots ?? {})) {
        schedule(`student "${id}" ${day} ${slot}`, entry);
      }
    }
    for (const item of [...student.gifts.loved, ...student.gifts.hated]) {
      exists(`student "${id}" gifts`, 'item', item, data.items);
    }
  }

  for (const [id, star] of Object.entries(data.stars)) {
    const where = `star "${id}"`;
    exists(where, 'student', star.student, data.students);
    if (star.location) exists(where, 'location', star.location, data.locations);
    condition(where, star.when, true);
    effects(where, star.effects, true);
    story(where, star.scene);
  }

  // a star can't need itself, directly or through other stars, or it could never light
  const needs = (star: string) => requiredStars(data.stars[star]?.when).filter((id) => id in data.stars);
  for (const start of Object.keys(data.stars)) {
    const stack = [...needs(start)];
    const seen = new Set<string>();
    while (stack.length > 0) {
      const star = stack.pop()!;
      if (star === start) {
        problems.push(`star "${start}": needs itself (through the stars it needs), so it can never light`);
        break;
      }
      if (seen.has(star)) continue;
      seen.add(star);
      stack.push(...needs(star));
    }
  }

  for (const [id, event] of Object.entries(data.events)) {
    const where = `event "${id}"`;
    condition(where, event.when, false);
    effects(where, event.effects, false);
    story(where, event.scene);
    if (event.weight !== undefined && event.weight <= 0) problems.push(`${where}: weight must be > 0`);
  }

  return problems;
};
