import { Card, TargetType } from "../model/card";
import { dealDamage, gainBlock } from "./effects";
import { randomId } from '../model/uid';

export const strike: Card = {
    name: 'Strike',
    cost: 1,
    targetType: TargetType.SINGLE,
    effects: [
        { 
          description: "Deal 6 damage.", 
          execute: (caster, targets) => dealDamage(caster, targets, 6), 
          sfxKey: 'attack'
        }
    ],
};

export const twinStrike: Card = {
    name: 'Twin Strike',
    cost: 1,
    targetType: TargetType.SINGLE,
    effects: [
        { 
          description: "Deal 5 damage.", 
          execute: (caster, targets) => dealDamage(caster, targets, 5), 
          sfxKey: 'attack'
        },
        { 
          description: "Deal 5 damage.", 
          execute: (caster, targets) => dealDamage(caster, targets, 5), 
          sfxKey: 'attack'
        },
    ],
};

export const defend: Card = {
    name: 'Defend',
    cost: 1,
    targetType: TargetType.SELF,
    effects: [
        { 
          description: "Gain 5 block.", 
          execute: (caster, targets) => gainBlock(caster, targets, 5), 
          sfxKey: 'block',
        },
    ],
};

// export const bash: Card = {
//     name: 'Bash',
//     cost: 2,
//     effects: [],
// };

// export const inflame: Card = {
//     name: 'Inflame',
//     cost: 1,
//     effects: [],
// };

/** Every card definition, keyed by its ID. Saves and decks refer to cards by these IDs. */
export const CARDS = { strike, twinStrike, defend } satisfies Record<string, Card>;
export type CardId = keyof typeof CARDS;

/**
 * One copy of a card in a deck. Copies of the same card share a definition
 * but each has its own `uid`, so a copy can later be changed (e.g. upgraded)
 * without affecting the others. Contains only plain data, so it can be saved.
 */
export type CardInstance = { uid: string; cardId: CardId };

export const createCardInstance = (cardId: CardId): CardInstance => ({
  uid: randomId(),
  cardId,
});

/** The definition behind a card copy: name, cost, effects. */
export const cardDef = (card: CardInstance): Card => CARDS[card.cardId];
