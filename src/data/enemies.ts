import { EnemyCombatant } from "../model/enemyCombatant";
import { dealDamage, gainBlock } from "./effects";

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
                    execute: (caster, targets) => dealDamage(caster, targets, 10)
                },
            ],
            getNextStateIndex: (battle, playerCombatant) => 1,
        },
        {
            effects: [
                {
                    description: 'bic block',
                    sfxKey: 'block',
                    execute:(caster, targets) => gainBlock(caster, [caster], 10)
                },
            ],
            getNextStateIndex: (battle, playerCombatant) => 2,
        },
        {
            effects: [
                {
                    description: 'small attacm',
                    sfxKey: 'attack',
                    execute: (caster, targets) => dealDamage(caster, targets, 5)
                },
                          {
                    description: 'small block',
                    sfxKey: 'block',
                    execute:(caster, targets) => gainBlock(caster, [caster], 5)
                },
            ],
            getNextStateIndex: (battle, playerCombatant) => 0,
        }
    ],
    stateIndex: 0,
}