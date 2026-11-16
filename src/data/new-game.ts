import { CardId, createCardInstance } from './cards';
import type { GameStateData } from '../state/gameState';

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
  spirits: 0,
  seenEnemies: [],
  stats: {},
  flags: {},
  relationships: {},
});
