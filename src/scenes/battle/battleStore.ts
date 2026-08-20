import { makeAutoObservable } from "mobx";

export class BattleStore {

  constructor() {

    makeAutoObservable(this);
  }

}
