import { Combatant } from "./combatant";
import { PlayerCombatant } from "./playerCombatant";

export enum TargetType {
    SINGLE = 'single',
    AOE = 'aoe',
    RANDOM = 'random', 
    SELF = 'self'
}

export type Effect = {
    description: string;
    execute: (player: PlayerCombatant, targets: Combatant[]) => void;
}

export type Card = {
    // artSrc: string;

    name: string;
    cost: number;
    effects: Effect[]; 
    targetType: TargetType;
}
