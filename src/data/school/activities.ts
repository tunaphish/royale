import type { ActivityDef } from '../../model/school';
import { when } from '../../model/conditions';
import { ITEMS } from './items';

/** Buying each gift in town: free (doesn't use the slot), if you have the gold. */
const shop: Record<string, ActivityDef> = Object.fromEntries(
  Object.entries(ITEMS).map(([id, item]) => [
    `buy-${id}`,
    {
      name: `Buy a ${item.name.toLowerCase()} (${item.price}g)`,
      location: 'town',
      free: true,
      when: when.gold(item.price),
      effects: [
        { kind: 'gold', amount: -item.price },
        { kind: 'item', item: id, amount: 1 },
      ],
    },
  ]),
);

/**
 * What the player can do on campus. `with: 'student'` activities are offered
 * once for each student at the location. Placeholder numbers.
 */
export const ACTIVITIES: Record<string, ActivityDef> = {
  // Classroom
  'attend-class': {
    name: 'Attend class',
    location: 'classroom',
    effects: [{ kind: 'stat', stat: 'wit', points: 2 }],
  },
  'sit-with': {
    name: 'Sit together in class',
    location: 'classroom',
    with: 'student',
    when: when.not(when.bandAtMost('cold')),
    effects: [
      { kind: 'stat', stat: 'wit', points: 1 },
      { kind: 'disposition', amount: 1 },
    ],
  },

  // Training grounds
  train: {
    name: 'Train alone',
    location: 'training',
    effects: [{ kind: 'stat', stat: 'nerve', points: 2 }],
  },
  spar: {
    name: 'Spar',
    location: 'training',
    with: 'student',
    when: when.not(when.bandAtMost('cold')),
    effects: [
      { kind: 'stat', stat: 'nerve', points: 1 },
      { kind: 'disposition', amount: 1 },
      { kind: 'intel', intel: 'deck', ofStudent: true },
    ],
  },
  watch: {
    name: 'Watch them train',
    location: 'training',
    with: 'student',
    when: when.not(when.studentIntel('deck')),
    effects: [{ kind: 'intel', intel: 'deck', ofStudent: true }],
  },

  // Library
  study: {
    name: 'Study',
    location: 'library',
    effects: [{ kind: 'stat', stat: 'wit', points: 2 }],
  },
  'research-rules': {
    name: "Research Friday's match rules",
    location: 'library',
    when: when.not(when.intel('match-rules')),
    effects: [{ kind: 'intel', intel: 'match-rules' }],
  },
  'research-biome': {
    name: "Research Friday's arena",
    location: 'library',
    when: when.all(when.intel('match-rules'), when.not(when.intel('match-biome'))),
    effects: [{ kind: 'intel', intel: 'match-biome' }],
  },

  // Cafeteria
  'hang-out': {
    name: 'Hang out',
    location: 'cafeteria',
    with: 'student',
    when: when.not(when.bandAtMost('cold')),
    effects: [
      { kind: 'stat', stat: 'charm', points: 1 },
      { kind: 'disposition', amount: 1 },
    ],
  },
  'work-the-room': {
    name: 'Work the room',
    location: 'cafeteria',
    effects: [{ kind: 'stat', stat: 'charm', points: 2 }],
  },

  // Town
  'part-time-job': {
    name: 'Part-time job',
    location: 'town',
    effects: [{ kind: 'gold', amount: 12 }],
  },
  ...shop,

  // Dorm
  'visit-room': {
    name: 'Visit their room',
    location: 'dorm',
    with: 'student',
    when: when.band('warm'),
    effects: [{ kind: 'disposition', amount: 2 }],
  },
  'write-letters': {
    name: 'Write letters home',
    location: 'dorm',
    effects: [
      { kind: 'stat', stat: 'charm', points: 1 },
      { kind: 'stat', stat: 'wit', points: 1 },
    ],
  },
};
