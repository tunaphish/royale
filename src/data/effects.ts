import { Battle } from "../scenes/battle/Battle";
import { Combatant } from "../model/combatant";
import { clamp } from "../util";

export const dealDamage = (battle: Battle, targets: Combatant[], potency: number): void => {
  targets.forEach(target => {
    let finalDamage = potency;

    const blocked = Math.min(target.block, finalDamage);
    target.block -= blocked;
    finalDamage -= blocked;

    target.health = clamp(0, target.health - finalDamage, target.maxHealth);
  });
}


export const gainBlock = (battle: Battle, targets: Combatant[], potency: number): void => {
  targets.forEach(target => {
    target.block += potency
  });
}