import { Battle } from "../scenes/battle/Battle";
import { Combatant } from "./combatant"
import { PlayerCombatant } from "./playerCombatant";

export type EnemyState = {
    display: string;
    actions: ((battle: Battle, enemyCombatant: EnemyCombatant) => void)[];
    getNextStateIndex: (battle: Battle, enemyCombatant: EnemyCombatant) => number;
} 

export type EnemyCombatant = Combatant & {
    name: string;
    states: EnemyState[];
    stateIndex: number;
}

// actions?