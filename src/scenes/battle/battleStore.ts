import { makeAutoObservable } from "mobx";
import { PlayerCombatant } from "../../model/playerCombatant";
import { Card } from "../../model/card";
import { EnemyCombatant } from "../../model/enemyCombatant";
import { Combatant } from "../../model/combatant";

export class BattleStore {
  playerCombatant: PlayerCombatant;
  enemyCombatants: EnemyCombatant[];
  
  selectedCard?: Card;
  targets: Combatant[];

  turnNumber: number;

  constructor(playerCombatant: PlayerCombatant, enemyCombatants: EnemyCombatant[]) {
    this.playerCombatant = playerCombatant;
    this.enemyCombatants = enemyCombatants;
    this.turnNumber = 0;
    makeAutoObservable(this);
  }

  setSelectedCard(card?: Card): void {
    this.selectedCard = card;
  }

  setTargets(targets: Combatant[]): void {
    this.targets = targets;
  }

  advanceTurnNumber(): void {
    this.turnNumber++;
  }
}
