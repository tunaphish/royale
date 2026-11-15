import { EnemyCombatant } from "../model/enemyCombatant";
import { dealDamage, gainBlock } from "./effects";

export const hexaghost: EnemyCombatant = {
    name: "Hexaghost",
    health: 70,
    maxHealth: 70,
    block: 0,
    activeTechniques: [],
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

/** Every enemy definition, keyed by its ID. */
export const ENEMIES = { hexaghost } satisfies Record<string, EnemyCombatant>;
export type EnemyId = keyof typeof ENEMIES;

/**
 * A fresh copy of an enemy for one battle, at full health. Battles change
 * health, block and state, so they must never use the definition itself.
 * The definition's states hold only functions and text, so they're shared.
 */
export const createEnemyCombatant = (enemyId: EnemyId): EnemyCombatant => {
  const definition = ENEMIES[enemyId];
  return {
    ...definition,
    health: definition.maxHealth,
    block: 0,
    stateIndex: 0,
    activeTechniques: definition.activeTechniques.map((active) => ({ ...active })),
  };
};
