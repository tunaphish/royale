import { makeAutoObservable } from 'mobx';
import type { Change } from '../../model/school';
import type { RoyaleResult } from '../../model/royaleStub';

/** Between Thursday afternoon and Saturday: the briefing, then the royale's results. */
export type Friday = { stage: 'briefing' } | { stage: 'results'; result: RoyaleResult };

/** What just happened, shown over the map until the player continues. */
export type SlotResult = {
  title: string;
  changes: Change[];
  /** The student it was done with, who can be given a gift. */
  student?: string;
  giftGiven: boolean;
  /** Continuing moves to the next slot. False after events and `auto` stars, which happen on their own. */
  usedSlot: boolean;
};

export class SchoolStore {
  /** The location whose options show, if any. */
  location: string | null = null;
  /** The outcome of the slot just played; continuing moves to the next slot. */
  result: SlotResult | null = null;
  /** What a free activity (shopping) just did; shown in the location panel. */
  notice: Change[] | null = null;
  /** Set once Thursday afternoon is over, until the next week starts. */
  friday: Friday | null = null;
  /** The constellation view is open, with this star picked to read about. */
  constellationOpen = false;
  selectedStar: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  setLocation(location: string | null): void {
    this.location = location;
    this.notice = null;
  }

  setResult(result: SlotResult | null): void {
    this.result = result;
  }

  addResultChanges(changes: Change[]): void {
    if (!this.result) return;
    this.result.changes.push(...changes);
    this.result.giftGiven = true;
  }

  setNotice(notice: Change[] | null): void {
    this.notice = notice;
  }

  setFriday(friday: Friday | null): void {
    this.friday = friday;
  }

  setConstellationOpen(open: boolean): void {
    this.constellationOpen = open;
    this.selectedStar = null;
  }

  selectStar(star: string | null): void {
    this.selectedStar = star;
  }
}
