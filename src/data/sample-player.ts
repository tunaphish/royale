import { PlayerCombatant } from "../model/playerCombatant";

import * as Cards from './cards';
import * as Techniques from './techinques';

export const samplePlayerCombatant: PlayerCombatant = {
    health: 58,
    maxHealth: 70,
    block: 0,
    energy: 3, 
    maxEnergy: 3,

    deck: [Cards.strike, Cards.strike, Cards.strike, Cards.strike, Cards.defend, Cards.defend, Cards.defend, Cards.defend, Cards.twinStrike, Cards.twinStrike, Cards.twinStrike, Cards.twinStrike],
    hand: [],
    discard: [],
    exhaust: [],

    activeTechniques: [{technique: Techniques.inflame, amount: 2}],
}