import { Card } from "./card";
import { Combatant } from "./combatant";

export type PlayerCombatant = Combatant & {
    energy: number;
    maxEnergy: number;

    deck: Card[];
    hand: Card[];
    discard: Card[];
    exhaust: Card[];
}