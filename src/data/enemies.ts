import { EnemyCombatant } from "../model/enemyCombatant";
import { dealDamage, gainBlock } from "./effects";
import { Battle } from "../scenes/battle/Battle";


export const hexaghost: EnemyCombatant = {
    name: "Hexaghost",
    health: 70,
    maxHealth: 70,
    block: 0,
    states: [
        {
            effects: [
                {
                    description: 'bic attack',
                    sfxKey: 'attack',
                    execute: (battle: Battle, enemyCombatant) => dealDamage(battle, [battle.store.playerCombatant], 10)
                },
            ],
            getNextStateIndex: (battle, playerCombatant) => 1,
        },
        {
            effects: [
                {
                    description: 'bic attack',
                    sfxKey: 'block',
                    execute:(battle: Battle, enemyCombatants) => gainBlock(battle, enemyCombatants, 10)
                },
            ],
            getNextStateIndex: (battle, playerCombatant) => 2,
        },
        {
            effects: [
                {
                    description: 'bic attack',
                    sfxKey: 'attack',
                    execute: (battle: Battle, enemyCombatant) => dealDamage(battle, [battle.store.playerCombatant], 5)
                },
                          {
                    description: 'small block',
                    sfxKey: 'block',
                    execute:(battle: Battle, enemyCombatants) => gainBlock(battle, enemyCombatants, 5)
                },
            ],
            getNextStateIndex: (battle, playerCombatant) => 0,
        }
    ],
    stateIndex: 0,
}