import { makeAutoObservable } from "mobx";
import { PlayerCombatant } from "../../model/playerCombatant";
import { EnemyCombatant } from "../../model/enemyCombatant";
import { Combatant } from "../../model/combatant";
import { Card } from "../../model/card";

export enum PileType {
  hand = 'hand',
  deck = 'deck',
  discard = 'discard',
  exhaust = 'exhaust',
}

export class BattleStore {
  playerCombatant: PlayerCombatant;
  enemyCombatants: EnemyCombatant[];
  
  //selections
  selectedPile: PileType = PileType.hand
  selectedCardIndex?: number = null;
  targets: Combatant[];

  turnNumber: number;

  constructor(playerCombatant: PlayerCombatant, enemyCombatants: EnemyCombatant[]) {
    this.playerCombatant = playerCombatant;
    this.enemyCombatants = enemyCombatants;
    this.turnNumber = 0;
    makeAutoObservable(this);
  }

  setSelectedCardIndex(cardIndex?: number): void {
    this.selectedCardIndex = cardIndex;
  }

  setTargets(targets: Combatant[]): void {
    this.targets = targets;
  }

  resetSelections(): void {
    this.targets = [];
    this.selectedCardIndex = null;
  }

  appendCardToDiscard(card: Card): void {
    this.playerCombatant.discard.push(card);
  }

  removeSelectedCardFromHand(): void {
    this.playerCombatant.hand.splice(this.selectedCardIndex, 1);
  }

  setSelectedPile(pileType: PileType): void {
    this.selectedPile = pileType;
  }

  advanceTurnNumber(): void {
    this.turnNumber++;
  }
}
