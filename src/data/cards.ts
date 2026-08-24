import { Card, TargetType } from "../model/card";
import { Combatant } from "../model/combatant";
import { PlayerCombatant } from "../model/playerCombatant";
import { clamp } from "../util";


const dealDamage = (playerCombatant: PlayerCombatant, targets: Combatant[], potency: number): void => {
  targets.forEach(target => {
    let finalDamage = potency;

    const blocked = Math.min(target.block, finalDamage);
    target.block -= blocked;
    finalDamage -= blocked;

    target.health = clamp(0, target.health - finalDamage, target.maxHealth);
  });
}


const gainBlock = (playerCombatant: PlayerCombatant, targets: Combatant[], potency: number): void => {
  targets.forEach(target => {
    target.block += potency
  });
}

export const strike: Card = {
    name: 'Strike',
    cost: 1,
    targetType: TargetType.SINGLE,
    effects: [
        { 
          description: "Deal 6 damage.", 
          execute: (playerCombatant, targets) => dealDamage(playerCombatant, targets, 6), 
          sfxKey: 'attack'
        }
    ],
};

export const twinStrike: Card = {
    name: 'Twin Strike',
    cost: 1,
    targetType: TargetType.SINGLE,
    effects: [
        { 
          description: "Deal 5 damage.", 
          execute: (playerCombatant, targets) => dealDamage(playerCombatant, targets, 5), 
          sfxKey: 'attack'
        },
        { 
          description: "Deal 5 damage.", 
          execute: (playerCombatant, targets) => dealDamage(playerCombatant, targets, 5), 
          sfxKey: 'attack'
        },
    ],
};

export const defend: Card = {
    name: 'Defend',
    cost: 1,
    targetType: TargetType.SELF,
    effects: [
        { 
          description: "Gain 5 block.", 
          execute: (playerCombatant, targets) => gainBlock(playerCombatant, targets, 5), 
          sfxKey: 'block',
        },
    ],
};

// export const bash: Card = {
//     name: 'Bash',
//     cost: 2,
//     effects: [],
// };

// export const inflame: Card = {
//     name: 'Inflame',
//     cost: 1,
//     effects: [],
// };