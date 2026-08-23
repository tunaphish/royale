import { makeAutoObservable } from "mobx";
import { PlayerCombatant } from "../../model/playerCombatant";
import { Card } from "../../model/card";
import { EnemyCombatant } from "../../model/enemyCombatant";

export class BattleStore {
  playerCombatant: PlayerCombatant;
  enemyCombatants: EnemyCombatant[];
  selectedCard: Card;

  constructor(playerCombatant: PlayerCombatant, enemyCombatants: EnemyCombatant[]) {
    this.playerCombatant = playerCombatant;
    this.enemyCombatants = enemyCombatants;
    makeAutoObservable(this);
  }

  setSelectedCard(card: Card): void {
    this.selectedCard = card;
  }
}
