import { makeAutoObservable } from "mobx";
import { PlayerCombatant } from "../../model/playerCombatant";

export class BattleStore {
  playerCombatant: PlayerCombatant;

  constructor(playerCombatant: PlayerCombatant) {
    this.playerCombatant = playerCombatant;
    makeAutoObservable(this);
  }
}
