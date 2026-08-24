import { EnemyCombatant } from "./enemyCombatant";
import { PlayerCombatant } from "./playerCombatant"

export type Battle = {
    playerCombatant: PlayerCombatant;
    enemieCombatants: EnemyCombatant[];
}