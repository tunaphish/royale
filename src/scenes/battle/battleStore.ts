import { makeAutoObservable } from "mobx";
import { PlayerCombatant } from "../../model/playerCombatant";
import { EnemyCombatant } from "../../model/enemyCombatant";
import { Combatant } from "../../model/combatant";
import type { CardInstance } from "../../data/cards";

export enum PileType {
  deck = 'deck',
  hand = 'hand',
  discard = 'discard',
}

export class BattleStore {
  playerCombatant: PlayerCombatant;
  enemyCombatants: EnemyCombatant[];
  
  //selections
  selectedPile: PileType = PileType.hand
  selectedCardIndex: number | null = null;
  targets: Combatant[];

  turnNumber: number;

  constructor(playerCombatant: PlayerCombatant, enemyCombatants: EnemyCombatant[]) {
    this.playerCombatant = playerCombatant;
    this.enemyCombatants = enemyCombatants;
    this.turnNumber = 0;
    makeAutoObservable(this);
  }

  get selectedCard(): CardInstance | null {
    if (this.selectedCardIndex === null) return null;
    return this.playerCombatant.hand[this.selectedCardIndex] ?? null;
  }

  setSelectedCardIndex(cardIndex: number | null): void {
    this.selectedCardIndex = cardIndex;
  }

  setTargets(targets: Combatant[]): void {
    this.targets = targets;
  }

  resetSelections(): void {
    this.targets = [];
    this.selectedCardIndex = null;
  }

  discardHand(): void {
    this.playerCombatant.discard.push(...this.playerCombatant.hand);
    this.playerCombatant.hand = [];
  }

  appendCardToDiscard(card: CardInstance): void {
    this.playerCombatant.discard.push(card);
  }

  removeSelectedCardFromHand(): void {
    if (this.selectedCardIndex === null) return;
    this.playerCombatant.hand.splice(this.selectedCardIndex, 1);
  }

  setSelectedPile(pileType: PileType): void {
    this.selectedPile = pileType;
  }

  advanceTurnNumber(): void {
    this.turnNumber++;
  }
}
