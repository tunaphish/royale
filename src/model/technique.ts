import { Combatant } from "./combatant"

export type Technique = {
    name: string;
    description: string;
    // art src

    onTurnStart?: (caster: Combatant, targets: Combatant[]) => void;
    onModifyDamage?: (caster: Combatant, targets: Combatant[]) => number;
}