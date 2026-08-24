import { Battle } from "../scenes/battle/Battle";
import { Effect } from "./card";
import { Combatant } from "./combatant"
import { PlayerCombatant } from "./playerCombatant";

export type EnemyState = {
    effects: Effect[];
    getNextStateIndex: (battle: Battle, enemyCombatant: EnemyCombatant) => number;
} 

export type EnemyCombatant = Combatant & {
    name: string;
    states: EnemyState[];
    stateIndex: number;
}

