import { Technique } from "../model/technique";

export const inflame: Technique = {
    name: 'Inflame',
    description: 'Add 3 damage to attacks',
    onModifyDamage: (caster, targets) => {
        return 3;
    }
}