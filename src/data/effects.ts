import { Combatant } from "../model/combatant";
import { clamp } from "../model/math";

export const dealDamage = (caster: Combatant, targets: Combatant[], potency: number): void => {
  for (const activeTechnique of caster.activeTechniques) {
    if (activeTechnique.technique.onModifyDamage) {
      potency += activeTechnique.technique.onModifyDamage(caster, targets) * activeTechnique.amount;
    }
  }

  targets.forEach(target => {
    let finalDamage = potency;

    const blocked = Math.min(target.block, finalDamage);
    target.block -= blocked;
    finalDamage -= blocked;

    target.health = clamp(0, target.health - finalDamage, target.maxHealth);
  });
}


export const gainBlock = (caster: Combatant, targets: Combatant[], potency: number): void => {
  targets.forEach(target => {
    target.block += potency;
  });
}