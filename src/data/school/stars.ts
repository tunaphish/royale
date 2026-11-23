import type { StarDef } from '../../model/school';
import { when } from '../../model/conditions';

/**
 * The constellation: authored scenes with each student. A star's scene is the
 * story of the same name in scripts/stories/. Its `hint` shows while it's dim.
 * Without a `location`, a ready star is offered wherever its student is.
 * Placeholder stars and scenes, four per student.
 */
export const STARS: Record<string, StarDef> = {
  // The thief
  'thief-sizing-up': {
    student: 'thief',
    name: 'Sizing up',
    hint: 'The thief trains every morning.',
    location: 'training',
    when: when.slot('morning'),
    scene: 'thief-sizing-up',
    effects: [{ kind: 'disposition', amount: 1 }],
  },
  'thief-rematch': {
    student: 'thief',
    name: 'Rematch',
    hint: 'The thief only respects nerve. (Nerve rank 2)',
    location: 'training',
    when: when.all(when.star('thief-sizing-up'), when.rank('nerve', 2)),
    scene: 'thief-rematch',
    effects: [{ kind: 'disposition', amount: 2 }],
  },
  'thief-scars': {
    student: 'thief',
    name: 'Scars',
    hint: 'Get on warmer terms with the thief.',
    when: when.all(when.star('thief-rematch'), when.band('warm')),
    scene: 'thief-scars',
    effects: [{ kind: 'disposition', amount: 1 }],
  },
  'thief-grudge': {
    student: 'thief',
    name: 'Grudge',
    hint: 'Something has to happen between you in the royale.',
    when: when.history('humiliated'),
    auto: true,
    scene: 'thief-grudge',
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

  // The knight
  'knight-vigil': {
    student: 'knight',
    name: 'Vigil',
    hint: 'The knight drills alone in the mornings.',
    location: 'training',
    when: when.slot('morning'),
    scene: 'knight-vigil',
    effects: [{ kind: 'disposition', amount: 1 }],
  },
  'knight-the-oath': {
    student: 'knight',
    name: 'The oath',
    hint: 'The knight values courtesy. (Charm rank 2)',
    when: when.all(when.star('knight-vigil'), when.rank('charm', 2)),
    scene: 'knight-the-oath',
    effects: [{ kind: 'disposition', amount: 1 }],
  },
  'knight-confession': {
    student: 'knight',
    name: 'Confession',
    hint: 'Get on warmer terms with the knight.',
    when: when.all(when.star('knight-the-oath'), when.band('warm')),
    scene: 'knight-confession',
    effects: [{ kind: 'disposition', amount: 2 }],
  },
  'knight-honor': {
    student: 'knight',
    name: 'Honor',
    hint: 'Show the knight mercy in the royale.',
    when: when.all(when.star('knight-vigil'), when.history('spared')),
    scene: 'knight-honor',
    effects: [{ kind: 'disposition', amount: 2 }],
  },

  // The mage
  'mage-spilled-ink': {
    student: 'mage',
    name: 'Spilled ink',
    hint: 'The mage studies in the library after class.',
    location: 'library',
    when: when.slot('afternoon'),
    scene: 'mage-spilled-ink',
    effects: [{ kind: 'disposition', amount: 1 }],
  },
  'mage-study-group': {
    student: 'mage',
    name: 'Study group',
    hint: 'The mage only shares notes with sharp minds. (Wit rank 2)',
    when: when.all(when.star('mage-spilled-ink'), when.rank('wit', 2)),
    scene: 'mage-study-group',
    effects: [{ kind: 'disposition', amount: 1 }],
  },
  'mage-under-the-hat': {
    student: 'mage',
    name: 'Under the hat',
    hint: 'Get on warmer terms with the mage, and find the mage in town on a weekend.',
    location: 'town',
    when: when.all(when.star('mage-study-group'), when.band('warm')),
    scene: 'mage-under-the-hat',
    effects: [{ kind: 'disposition', amount: 2 }],
  },
  'mage-backfire': {
    student: 'mage',
    name: 'Backfire',
    hint: 'Help the mage out in the royale.',
    when: when.all(when.star('mage-spilled-ink'), when.history('aided')),
    scene: 'mage-backfire',
    effects: [{ kind: 'disposition', amount: 2 }],
  },
};
