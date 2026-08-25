import { Combatant } from "./combatant";

export enum TargetType {
    SINGLE = 'single',
    AOE = 'aoe',
    RANDOM = 'random', 
    SELF = 'self'
}

export type Effect = {
    description: string;
    execute: (caster: Combatant, targets: Combatant[]) => void;
    sfxKey: string;
}

export type Card = {
    // artSrc: string;

    name: string;
    cost: number;
    effects: Effect[]; 
    targetType: TargetType;
}
