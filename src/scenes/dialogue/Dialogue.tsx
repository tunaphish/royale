import * as Phaser from 'phaser';
import * as React from 'react';
import { observable, reaction } from 'mobx';
import ReactOverlay from '../../plugins/ReactOverlay';
import GameSession from '../../plugins/GameSession';
import type { FxSystem } from '../../fx/FxSystem';
import { Stage } from '../../stage/Stage';
import { addCrt } from '../../fx/crt';
import { StoryPlayer } from '../story/StoryPlayer';
import { DialogueView } from './DialogueView';

const sceneConfig: Phaser.Types.Scenes.SettingsConfig = {
  active: false,
  visible: false,
  key: 'Dialogue',
};

/** `crt` (any value, e.g. `?scene=Dialogue&storyKey=final-battle&crt`) tests the CRT TV filter over the stage. */
export type DialogueData = { storyKey: string; crt?: string };

/** How long the stage takes to fade in and out, matching the UI's fade. */
const FADE_MS = 1000;

/**
 * Plays one ink story, then goes back to the story list. The story itself
 * runs in a `StoryPlayer`, shared with other screens that play stories.
 */
export class Dialogue extends Phaser.Scene {
  reactOverlay: ReactOverlay;
  session: GameSession;
  fx: FxSystem;
  player: StoryPlayer;
  /** The story has ended and the screen is fading out; `leave` runs once it has. */
  readonly leaving = observable.box(false);

  private storyKey: string;
  private crt = false;

  constructor() {
    super(sceneConfig);
  }

  init(data: DialogueData): void {
    if (!data.storyKey) {
      throw new Error('[Dialogue] started without a storyKey');
    }
    this.storyKey = data.storyKey;
    this.crt = data.crt !== undefined;
    this.leaving.set(false);

    // leaving the scene is an autosave checkpoint, for anything ink changed
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.session.save());
  }

  create(): void {
    this.player = new StoryPlayer(this, new Stage(this, this.fx));
    if (this.crt) addCrt(this);
    this.cameras.main.fadeIn(FADE_MS);

    // the UI fades out over the same time, then calls leave()
    const stop = reaction(() => this.leaving.get(), (leaving) => leaving && this.cameras.main.fadeOut(FADE_MS));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, stop);

    this.reactOverlay.create(<DialogueView dialogue={this} />, this);
    this.player.play(this.storyKey).then(() => this.leaving.set(true));
  }

  leave(): void {
    this.scene.start('DialogueList');
  }
}
