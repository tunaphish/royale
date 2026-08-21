import { Combatant } from "./combatant";
import { PlayerCombatant } from "./playerCombatant";

export type Card = {
    name: string;
    cost: number;
    effects: ((player: PlayerCombatant, targets: Combatant[]) => void)[]; // store list of functions
}
