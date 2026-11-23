import * as Phaser from 'phaser';
import * as React from 'react';
import ReactOverlay from '../../plugins/ReactOverlay';
import GameSession from '../../plugins/GameSession';
import type { FxSystem } from '../../fx/FxSystem';
import type { FxHandle } from '../../fx/FxHandle';
import { Stage } from '../../stage/Stage';
import { SCHOOL } from '../../data/school';
import { INTEL } from '../../data/school/intel';
import { CAMPUS_BACKGROUND } from '../../data/school/locations';
import { advance, calendarAt } from '../../model/calendar';
import { seededRoll } from '../../model/random';
import { applyRoyale, stubRoyale } from '../../model/royaleStub';
import {
  applyEffects, finishScene, giveGift, openLocations, optionsAt, pickDayEvent, readyAutoStar,
  sceneStory, scriptedEvent, studentLocations, usesSlot, type PlayedScene, type SchoolOption,
} from '../../model/school';
import { describeChange, studentName } from '../../model/schoolText';
import { StoryPlayer } from '../story/StoryPlayer';
import { SchoolStore } from './schoolStore';
import { SchoolView } from './SchoolView';

const sceneConfig: Phaser.Types.Scenes.SettingsConfig = {
  active: false,
  visible: false,
  key: 'School',
};

const FADE_MS = 500;
/** How long the lights take to change between places. */
const LIGHTING_FADE_MS = 500;

/**
 * The school week, on the same screen as stories: the stage on top shows
 * where the player is, the message box below shows the map, what can be done
 * and what happened, with the week's status along its bottom.
 *
 * Pick a location, pick an activity, see what changed, move on to the next
 * slot. Rules live in `model/school.ts`; this scene runs them against the
 * session's game state. Scenes (stars, events, activities with a story) play
 * right here through the `StoryPlayer`, over the place they happen.
 *
 * Events are checked when a new day starts, `auto` stars whenever the player
 * arrives at a slot. After Thursday afternoon comes Friday: a briefing on
 * what the player knows, then the royale. Until the royale exists,
 * `stubRoyale` makes up its results.
 */
export class School extends Phaser.Scene {
  reactOverlay: ReactOverlay;
  session: GameSession;
  fx: FxSystem;
  store: SchoolStore;
  player: StoryPlayer;

  /** The place the stage is lit for ('' for none) and the light FX it started. */
  private lit: { place: string; fx: FxHandle[] } | null = null;

  constructor() {
    super(sceneConfig);
  }

  init(): void {
    this.store = new SchoolStore();
    this.lit = null;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.session.save());
  }

  create(): void {
    this.player = new StoryPlayer(this, new Stage(this, this.fx));
    this.showPlace();
    this.cameras.main.fadeIn(FADE_MS);
    this.reactOverlay.create(<SchoolView school={this} />, this);
    // a reload, or a new game: only scripted beats (the opening), so random events aren't rolled twice
    this.arrive(this.now.dayStart ? 'scripted' : 'none');
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

  studentsAt(location: string): string[] {
    const where = this.where;
    return Object.keys(where).filter((student) => where[student] === location);
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
  /** Busy with something the player has to finish first: a story, a result, Friday. */
  private get busy(): boolean {
    return this.player.playing || !!this.store.result || !!this.store.friday;
  }

  selectLocation(location: string | null): void {
    if (this.busy) return;
    this.sound.play(location ? 'choice-select' : 'menu-exit');
    this.store.setLocation(location);
    this.showPlace();
  }

  pick(option: SchoolOption): void {
    if (this.busy) return;
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
   * Moves on from a result or Friday. After something that used the slot,
   * moves to the next slot that isn't lost, through Friday when the week ends.
   */
  continue(): void {
    this.sound.play('window-advance');
    const { result, friday } = this.store;
    this.store.setResult(null);
    this.store.setLocation(null);
    this.showPlace();

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
    if (this.player.playing) return;
    this.sound.play(this.store.constellationOpen ? 'menu-exit' : 'choice-select');
    this.store.setConstellationOpen(!this.store.constellationOpen);
    this.showPlace();
  }

  selectStar(star: string | null): void {
    this.sound.play('choice-hover');
    this.store.selectStar(star);
  }
  // #endregion

  // #region The stage

  /**
   * Sets the stage for where the player is: the constellation's empty sky, a
   * picked location with a student who's there, or the campus.
   */
  private showPlace(): void {
    const { store } = this.player;
    if (this.store.constellationOpen) {
      store.setBackground(null);
      store.setPortrait(null);
      this.showLighting(null);
      return;
    }
    const location = this.store.location;
    store.setBackground(location ? SCHOOL.locations[location].background : CAMPUS_BACKGROUND);
    // the stage holds one character: the first student here
    const student = location ? this.studentsAt(location)[0] : undefined;
    store.setPortrait(student ? { character: student } : null);
    this.showLighting(location);
  }

  /**
   * Lights the stage for a place (its mood and light FX), unless it's already
   * lit for it. No place, or a place without lighting, fades to `flat`.
   */
  private showLighting(location: string | null): void {
    const place = location ?? '';
    if (this.lit?.place === place) return;

    this.lit?.fx.forEach((handle) => handle.stop());
    const lighting = location ? SCHOOL.locations[location].lighting : undefined;
    this.fx.setMood(lighting?.mood ?? 'flat', { fade: LIGHTING_FADE_MS });
    this.lit = {
      place,
      fx: (lighting?.fx ?? []).map((id) => this.fx.play(id, { duration: 'infinite' })),
    };
  }
  // #endregion

  // #region Scenes

  /**
   * Plays a scene's story over the current place, then applies what it does.
   * Without a story, applies it straight away.
   */
  private async play(played: PlayedScene): Promise<void> {
    const storyKey = sceneStory(SCHOOL, played);
    if (storyKey) {
      if (this.store.constellationOpen) this.store.setConstellationOpen(false);
      this.store.setNotice(null);
      this.showPlace();
      await this.player.play(storyKey);
      // reset() stops every FX and fades to flat, the place's lights included
      this.player.reset();
      this.lit = null;
      this.showPlace();
    }
    this.finish(played);
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
