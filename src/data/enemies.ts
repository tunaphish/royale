import { EnemyCombatant } from "../model/enemyCombatant";
import { dealDamage, gainBlock } from "./effects";
import { Battle } from "../scenes/battle/Battle";


export const SAMPLE_ENEMY: EnemyCombatant = {
    name: "Hexaghost",
    health: 58,
    maxHealth: 70,
    block: 3,
    states: [
        {
            display: "Deal 10 damage",
            actions: [
                (battle: Battle, enemyCombatant) => dealDamage(battle, [battle.store.playerCombatant], 10),
            ],
            getNextStateIndex: (battle, playerCombatant) => 1,
        },
        {
            display: "Gain 10 block",
            actions: [
                (battle: Battle, enemyCombatant) => gainBlock(battle, [enemyCombatant], 10),
            ],
            getNextStateIndex: (battle, playerCombatant) => 2,
        },
        {
            display: "Gain 5 block. Deal 10 damage",
            actions: [
                (battle: Battle, enemyCombatant) => gainBlock(battle, [enemyCombatant], 5),
                (battle: Battle, enemyCombatant) => dealDamage(battle, [battle.store.playerCombatant], 10),
            ],
            getNextStateIndex: (battle, playerCombatant) => 0,
        }
    ],
    stateIndex: 0,
}