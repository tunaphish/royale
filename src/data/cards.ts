import { Card, TargetType } from "../model/card";

export const strike: Card = {
    name: 'Strike',
    cost: 1,
    targetType: TargetType.SINGLE,
    effects: [
        { descriptionTemplate: "Deal 6 damage.", execute: (playerCombatant, targets) => { console.log("hi") }, potency: 6 }
    ],
};

export const twinStrike: Card = {
    name: 'Twin Strike',
    cost: 1,
    targetType: TargetType.SINGLE,
    effects: [
        { descriptionTemplate: "Deal 5 damage.", execute: (playerCombatant, targets) => { console.log("hi") }, potency: 5 },
        { descriptionTemplate: "Deal 5 damage.", execute: (playerCombatant, targets) => { console.log("hi") }, potency: 5 }
    ],
};

export const defend: Card = {
    name: 'Defend',
    cost: 1,
    targetType: TargetType.SELF,
    effects: [
        { descriptionTemplate: "Gain 5 block.", execute: (playerCombatant, targets) => { console.log("hi") }, potency: 5 },
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