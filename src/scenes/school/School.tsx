import * as Phaser from 'phaser';
import * as React from 'react';
import ReactOverlay from '../../plugins/ReactOverlay';
import GameSession from '../../plugins/GameSession';
import { SCHOOL } from '../../data/school';
import { INTEL } from '../../data/school/intel';
import { advance, calendarAt } from '../../model/calendar';
import { seededRoll } from '../../model/random';
import { applyRoyale, stubRoyale } from '../../model/royaleStub';
import {
  applyEffects, finishScene, giveGift, openLocations, optionsAt, pickDayEvent, readyAutoStar,
  sceneStory, scriptedEvent, studentLocations, usesSlot, type PlayedScene, type SchoolOption,
} from '../../model/school';
import type { DialogueData } from '../dialogue/Dialogue';
import { describeChange, studentName } from '../../model/schoolText';
import { SchoolStore } from './schoolStore';
import { SchoolView } from './SchoolView';

/** `played`: the scene the player just came back from, to finish. */
type SchoolData = { played?: PlayedScene };

const sceneConfig: Phaser.Types.Scenes.SettingsConfig = {
  active: false,
  visible: false,
  key: 'School',
};

/**
 * The school week: pick a location, pick an activity, see what changed, and
 * move on to the next slot. Rules live in `model/school.ts`; this scene runs
 * them against the session's game state.
 *
 * Scenes (stars, events, activities with a story) play in the Dialogue
 * scene, which comes back here with what was played; its effects apply then.
 * Events are checked when a new day starts, `auto` stars whenever the player
 * arrives at a slot.
 *
 * After Thursday afternoon comes Friday: a briefing on what the player knows,
 * then the royale. Until the royale exists, `stubRoyale` makes up its results.
 */
export class School extends Phaser.Scene {
  reactOverlay: ReactOverlay;
  session: GameSession;
  store: SchoolStore;

  private played?: PlayedScene;

  constructor() {
    super(sceneConfig);
  }

  init(data?: SchoolData): void {
    this.store = new SchoolStore();
    this.played = data?.played;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.session.save());
  }

  create(): void {
    this.reactOverlay.create(<SchoolView school={this} />, this);
    if (this.played) this.finish(this.played);
    // a reload, or a new game: only scripted beats (the opening), so random events aren't rolled twice
    else this.arrive(this.now.dayStart ? 'scripted' : 'none');
  }

  // #region Read by the view (observable through the game state)
  get state() {
    return this.session.state;
  }

  get now() {
    return calendarAt(this.state.calendar.time);
  }

  /** Where each student is this slot. */
  get where(): Record<string, string> {
    return studentLocations(SCHOOL.students, this.state.calendar.time, this.state.calendar.seed);
  }

  get openLocations(): string[] {
    return openLocations(SCHOOL, this.state);
  }

  options(location: string): SchoolOption[] {
    return optionsAt(SCHOOL, location, this.state, this.where);
  }

  optionName(option: SchoolOption | { kind: 'activity'; activity: string; student?: string }): string {
    if (option.kind === 'star') return `★ ${SCHOOL.stars[option.star].name}`;
    const activity = SCHOOL.activities[option.activity];
    return option.student ? `${activity.name} with ${studentName(SCHOOL, option.student)}` : activity.name;
  }


  describe = (change: Parameters<typeof describeChange>[2]): string => describeChange(SCHOOL, INTEL, change);
  // #endregion

  // #region Called by the view
  selectLocation(location: string | null): void {
    if (this.store.result || this.store.friday) return;
    this.sound.play(location ? 'choice-select' : 'menu-exit');
    this.store.setLocation(location);
  }

  pick(option: SchoolOption): void {
    if (this.store.result) return;
    this.sound.play('choice-select');
    if (option.kind === 'star') {
      this.play({ kind: 'star', star: option.star });
      return;
    }
    const activity = SCHOOL.activities[option.activity];
    if (activity.free) {
      this.store.setNotice(applyEffects(this.state, activity.effects, option.student));
      return;
    }
    this.play({ kind: 'activity', activity: option.activity, student: option.student });
  }

  /** Gives the student from the slot's activity a gift; once per slot. */
  gift(item: string): void {
    const result = this.store.result;
    if (!result?.student || result.giftGiven) return;
    this.sound.play('choice-select');
    this.store.addResultChanges(giveGift(SCHOOL, this.state, result.student, item));
  }

  /**
   * Dismisses the result or Friday card. After something that used the slot,
   * moves on to the next slot that isn't lost, through Friday when the week ends.
   */
  continue(): void {
    this.sound.play('window-advance');
    const { result, friday } = this.store;
    this.store.setResult(null);
    this.store.setLocation(null);

    if (friday?.stage === 'briefing') {
      this.runRoyale();
      return;
    }
    if (friday?.stage === 'results') {
      this.store.setFriday(null);
      this.arrive('all');
      return;
    }
    if (result && !result.usedSlot) {
      this.arrive('none');
      return;
    }

    const next = advance(this.state.calendar.time, this.state.calendar.lostSlots);
    if (next.royale) {
      this.store.setFriday({ stage: 'briefing' });
      return;
    }
    this.state.setTime(next.time);
    this.session.save();
    this.arrive(calendarAt(next.time).dayStart ? 'all' : 'none');
  }

  toggleConstellation(): void {
    this.sound.play(this.store.constellationOpen ? 'menu-exit' : 'choice-select');
    this.store.setConstellationOpen(!this.store.constellationOpen);
  }

  selectStar(star: string | null): void {
    this.sound.play('choice-hover');
    this.store.selectStar(star);
  }
  // #endregion

  // #region Scenes

  /** Plays a scene's story in the Dialogue scene, which comes back here to finish it. Without a story, finishes it now. */
  private play(played: PlayedScene): void {
    const storyKey = sceneStory(SCHOOL, played);
    if (!storyKey) {
      this.finish(played);
      return;
    }
    const data: DialogueData = { storyKey, returnTo: 'School', returnData: { played } satisfies SchoolData };
    this.scene.start('Dialogue', data);
  }

  /** Applies what a scene does and shows it. */
  private finish(played: PlayedScene): void {
    const changes = finishScene(SCHOOL, this.state, played);
    this.session.save();
    this.store.setResult({
      title: this.playedTitle(played),
      changes,
      student: this.playedStudent(played),
      giftGiven: false,
      usedSlot: usesSlot(SCHOOL, played),
    });
  }

  /**
   * What happens on arriving at a slot, before the player picks anything:
   * the day's event, else a ready `auto` star. `events` says which events can
   * happen: `all` when a day starts, `scripted` (only `always` events) after a
   * reload, `none` mid-day.
   */
  private arrive(events: 'all' | 'scripted' | 'none'): void {
    const { time, seed } = this.state.calendar;
    if (events !== 'none') {
      const rolls: [number, number] = [seededRoll(seed, 'event', time, 0), seededRoll(seed, 'event', time, 1)];
      const event = events === 'all' ? pickDayEvent(SCHOOL, this.state, rolls) : scriptedEvent(SCHOOL, this.state);
      if (event) {
        this.play({ kind: 'event', event });
        return;
      }
    }
    const star = readyAutoStar(SCHOOL, this.state);
    if (star) this.play({ kind: 'star', star });
  }

  /** Friday: the stub royale's results go into the game, and the next week starts. */
  private runRoyale(): void {
    const { calendar } = this.state;
    const result = stubRoyale(Object.keys(SCHOOL.students), calendar.seed, this.now.week);
    applyRoyale(this.state, result);
    this.state.setTime(advance(calendar.time, calendar.lostSlots).time);
    this.session.save();
    this.store.setFriday({ stage: 'results', result });
  }

  private playedTitle(played: PlayedScene): string {
    switch (played.kind) {
      case 'star':
        return SCHOOL.stars[played.star].name;
      case 'event':
        return SCHOOL.events[played.event].name;
      case 'activity':
        return this.optionName(played);
    }
  }

  /** Who can be given a gift afterwards: the student it was done with, not after events or `auto` stars. */
  private playedStudent(played: PlayedScene): string | undefined {
    if (played.kind === 'activity') return played.student;
    if (played.kind === 'star' && !SCHOOL.stars[played.star].auto) return SCHOOL.stars[played.star].student;
    return undefined;
  }
  // #endregion
}
