import { CardId, createCardInstance } from './cards';
import type { GameStateData } from '../state/gameState';

/** Every student's ELO when they enroll. */
export const STARTING_ELO = 1000;

const STARTING_DECK: CardId[] = [
  'strike', 'strike', 'strike', 'strike',
  'defend', 'defend', 'defend', 'defend',
  'twinStrike', 'twinStrike', 'twinStrike', 'twinStrike',
];

/** The state a brand new game starts with. */
export const newGameState = (): GameStateData => ({
  player: {
    health: 58,
    maxHealth: 70,
    maxEnergy: 3,
    deck: STARTING_DECK.map(createCardInstance),
    techniques: [{ techniqueId: 'inflame', amount: 2 }],
  },
  gold: 0,
  elo: STARTING_ELO,
  seenEnemies: [],
  stats: {},
  flags: {},
  students: {},
  calendar: { time: 0, lostSlots: [], seed: newSeed() },
  stars: [],
  history: [],
  intel: [],
  inventory: {},
});

/** A game's random seed, fixed for the whole game. */
export const newSeed = (): number => Math.floor(Math.random() * 0x7fffffff);
