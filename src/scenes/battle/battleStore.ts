import { makeAutoObservable } from "mobx";
import { PlayerCombatant } from "../../model/playerCombatant";
import { Card } from "../../model/card";

export class BattleStore {
  playerCombatant: PlayerCombatant;
  selectedCard: Card;

  constructor(playerCombatant: PlayerCombatant) {
    this.playerCombatant = playerCombatant;
    makeAutoObservable(this);
  }

  setSelectedCard(card: Card): void {
    this.selectedCard = card;
  }
}
