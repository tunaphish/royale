import type { EventDef } from '../../model/school';
import { when } from '../../model/conditions';

/**
 * What can happen at the start of a day (DAY_EVENT_CHANCE in model/school.ts).
 * Each plays the story of the same name in scripts/stories/, then its effects
 * apply. Events happen once unless they `repeat`; `always` events happen as
 * soon as they can, without a roll. Placeholder events.
 */
export const EVENTS: Record<string, EventDef> = {
  // The first Saturday: the orientation royale, told as a cutscene. Placeholder results.
  'event-opening': {
    name: 'Orientation',
    scene: 'event-opening',
    always: true,
    when: when.all(when.week(1), when.day('sat')),
    effects: [
      { kind: 'gold', amount: 10 },
      { kind: 'history', student: 'thief', event: 'humiliated' },
      { kind: 'disposition', student: 'thief', amount: -2 },
    ],
  },
  'event-care-package': {
    name: 'Care package',
    scene: 'event-care-package',
    effects: [{ kind: 'gold', amount: 10 }],
  },
  'event-detention': {
    name: 'Detention',
    scene: 'event-detention',
    when: when.weekday(),
    effects: [{ kind: 'loseSlots', count: 1 }],
  },
  'event-rumor': {
    name: 'A rumor',
    scene: 'event-rumor',
    when: when.not(when.intel('match-rules')),
    effects: [{ kind: 'intel', intel: 'match-rules' }],
  },
  'event-scuffle': {
    name: 'Scuffle in the hall',
    scene: 'event-scuffle',
    when: when.all(when.weekday(), when.bandAtMost('cold', 'thief')),
    effects: [
      { kind: 'stat', stat: 'nerve', points: 1 },
      { kind: 'disposition', student: 'thief', amount: -1 },
    ],
  },
};
