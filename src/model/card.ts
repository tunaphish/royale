import { Combatant } from "./combatant";
import { PlayerCombatant } from "./playerCombatant";

export enum TargetType {
    SINGLE = 'single',
    AOE = 'aoe',
    RANDOM = 'random', 
    SELF = 'self'
}

export type Effect = {
    descriptionTemplate: string;
    execute: (player: PlayerCombatant, targets: Combatant[]) => void;
    potency?: number;
}

export type Card = {
    // artSrc: string;

    name: string;
    cost: number;
    effects: Effect[]; 
    targetType: TargetType;
}
