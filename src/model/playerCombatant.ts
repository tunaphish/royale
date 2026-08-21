import { Card } from "./card";
import { Combatant } from "./combatant";

export type PlayerCombatant = Combatant & {
    deck: Card[];
    hand: Card[];
    discard: Card[];
    exhaust: Card[];
    energy: number;
    maxEnergy: number;   
}