import { Card, TargetType } from "../model/card";
import { dealDamage, gainBlock } from "./effects";

export const strike: Card = {
    name: 'Strike',
    cost: 1,
    targetType: TargetType.SINGLE,
    effects: [
        { 
          description: "Deal 6 damage.", 
          execute: (caster, targets) => dealDamage(caster, targets, 6), 
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
          execute: (caster, targets) => dealDamage(caster, targets, 5), 
          sfxKey: 'attack'
        },
        { 
          description: "Deal 5 damage.", 
          execute: (caster, targets) => dealDamage(caster, targets, 5), 
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
          execute: (caster, targets) => gainBlock(caster, targets, 5), 
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