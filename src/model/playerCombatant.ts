import type { CardInstance } from "../data/cards";
import { Combatant } from "./combatant";

export type PlayerCombatant = Combatant & {
    energy: number;
    maxEnergy: number;

    deck: CardInstance[];
    hand: CardInstance[];
    discard: CardInstance[];
    exhaust: CardInstance[];
}