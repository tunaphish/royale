import { Technique } from "../model/technique";

export const inflame: Technique = {
    name: 'Inflame',
    description: 'Add 3 damage to attacks',
    onModifyDamage: (caster, targets) => {
        return 3;
    }
}

/** Every technique definition, keyed by its ID. */
export const TECHNIQUES = { inflame } satisfies Record<string, Technique>;
export type TechniqueId = keyof typeof TECHNIQUES;
