import type { StarDef } from '../../model/school';
import { when } from '../../model/conditions';

/**
 * The constellation: authored scenes with each student. A star's scene is the
 * story of the same name in scripts/stories/. Its `hint` shows while it's dim.
 * Without a `location`, a ready star is offered wherever its student is.
 * Placeholder stars and scenes, four per student.
 */
export const STARS: Record<string, StarDef> = {
  // Eji
  'eji-sizing-up': {
    student: 'eji',
    name: 'Sizing up',
    hint: 'Eji trains every morning.',
    location: 'training',
    when: when.slot('morning'),
    scene: 'eji-sizing-up',
    effects: [{ kind: 'disposition', amount: 1 }],
  },
  'eji-rematch': {
    student: 'eji',
    name: 'Rematch',
    hint: 'Eji only respects nerve. (Nerve rank 2)',
    location: 'training',
    when: when.all(when.star('eji-sizing-up'), when.rank('nerve', 2)),
    scene: 'eji-rematch',
    effects: [{ kind: 'disposition', amount: 2 }],
  },
  'eji-scars': {
    student: 'eji',
    name: 'Scars',
    hint: 'Get on warmer terms with Eji.',
    when: when.all(when.star('eji-rematch'), when.band('warm')),
    scene: 'eji-scars',
    effects: [{ kind: 'disposition', amount: 1 }],
  },
  'eji-grudge': {
    student: 'eji',
    name: 'Grudge',
    hint: 'Something has to happen between you in the royale.',
    when: when.history('humiliated'),
    auto: true,
    scene: 'eji-grudge',
    effects: [{ kind: 'mood', mood: 'furious', slots: 4 }],
  },

  // Rena
  'rena-first-words': {
    student: 'rena',
    name: 'First words',
    hint: 'Rena eats in the cafeteria.',
    location: 'cafeteria',
    scene: 'rena-first-words',
    effects: [{ kind: 'disposition', amount: 1 }],
  },
  'rena-the-ask': {
    student: 'rena',
    name: 'The ask',
    hint: 'Rena likes people who can talk. (Charm rank 2)',
    when: when.all(when.star('rena-first-words'), when.rank('charm', 2)),
    scene: 'rena-the-ask',
    effects: [{ kind: 'disposition', amount: 1 }],
  },
  'rena-day-off': {
    student: 'rena',
    name: 'Day off',
    hint: 'Get on warmer terms with Rena, and find Rena in town on a weekend.',
    location: 'town',
    when: when.all(when.star('rena-the-ask'), when.band('warm')),
    scene: 'rena-day-off',
    effects: [{ kind: 'disposition', amount: 2 }],
  },
  'rena-spared': {
    student: 'rena',
    name: 'Spared',
    hint: 'Something has to happen between you in the royale.',
    when: when.all(when.star('rena-first-words'), when.history('spared')),
    scene: 'rena-spared',
    effects: [{ kind: 'disposition', amount: 2 }],
  },

  // The witch
  'witch-cold-fire': {
    student: 'witch',
    name: 'Cold fire',
    hint: 'The witch keeps to the library.',
    location: 'library',
    scene: 'witch-cold-fire',
    effects: [{ kind: 'disposition', amount: 1 }],
  },
  'witch-the-price': {
    student: 'witch',
    name: 'The price',
    hint: 'The witch has no time for fools. (Wit rank 2)',
    location: 'library',
    when: when.all(when.star('witch-cold-fire'), when.rank('wit', 2)),
    scene: 'witch-the-price',
    effects: [{ kind: 'disposition', amount: 1 }],
  },
  'witch-her-room': {
    student: 'witch',
    name: 'Her room',
    hint: 'Get on warmer terms with the witch.',
    location: 'dorm',
    when: when.all(when.star('witch-the-price'), when.band('warm')),
    scene: 'witch-her-room',
    effects: [{ kind: 'disposition', amount: 2 }],
  },
  'witch-debt': {
    student: 'witch',
    name: 'Debt',
    hint: 'Do the witch a favor in the royale.',
    when: when.all(when.star('witch-cold-fire'), when.history('aided')),
    scene: 'witch-debt',
    effects: [{ kind: 'disposition', amount: 2 }],
  },
};
