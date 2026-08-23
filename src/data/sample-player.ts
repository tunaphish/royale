import { PlayerCombatant } from "../model/playerCombatant";

import * as Cards from './cards';

export const samplePlayerCombatant: PlayerCombatant = {
    health: 58,
    maxHealth: 70,
    block: 0,
    energy: 3, 
    maxEnergy: 3,

    deck: [Cards.strike, Cards.strike, Cards.strike, Cards.strike, Cards.defend, Cards.defend, Cards.defend, Cards.defend, Cards.twinStrike],
    hand: [],
    discard: [],
    exhaust: [],
}