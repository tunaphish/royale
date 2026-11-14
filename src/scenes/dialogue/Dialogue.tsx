import * as React from 'react';
import { load } from 'js-yaml';
import ReactOverlay from '../../plugins/ReactOverlay';
import { DialogueView } from './DialogueView';
import { Choice, DialogueStore } from './dialogueStore';

const sceneConfig: Phaser.Types.Scenes.SettingsConfig = {
  active: false,
  visible: false,
  key: 'Dialogue',
};

type Scripts = Record<string, string[]>;
type DialogueData = { scriptFileKey?: string; scriptKey?: string };

export class Dialogue extends Phaser.Scene {
  reactOverlay: ReactOverlay;
  store: DialogueStore;

  private scripts: Scripts;
  private dialogueAdvanceSound?: Phaser.Sound.BaseSound;
  private choiceSelectSound?: Phaser.Sound.BaseSound;
  private music?: Phaser.Sound.BaseSound;

  constructor() {
    super(sceneConfig);
  }

  init(data: DialogueData): void {
    const scriptFileKey = data.scriptFileKey ?? 'final-battle';
    const scriptKey = data.scriptKey ?? 'start';

    this.scripts = (load(this.cache.text.get(scriptFileKey)) as Scripts) ?? {};
    this.store = new DialogueStore(this.scripts[scriptKey] ?? []);

    this.dialogueAdvanceSound = this.addSound('window-advance');
    this.choiceSelectSound = this.addSound('choice-select');
  }

  create(): void {
    this.reactOverlay.create(<DialogueView dialogue={this} />, this);
    this.runFrom(0);
  }

  // #region handle events
  advance(): void {
    const { store } = this;
    if (store.isLeaving || store.choices) return;

    this.runFrom(store.lineIndex + 1);
  }

  selectChoice(choice: Choice): void {
    this.choiceSelectSound?.play();
    this.store.setScript(this.scripts[choice.newScriptKey] ?? []);
    this.runFrom(0);
  }

  leave(): void {
    this.scene.start('DialogueList');
  }
  // #endregion

  /**
   * Runs non-blocking actions (show, enter, foreground, play) until it reaches a line
   * that waits for the player (says, announce, display, choose).
   */
  private runFrom(startIndex: number): void {
    const { store } = this;
    const script = store.script;

    for (let i = startIndex; i < script.length; i++) {
      const [keys, value = ''] = script[i].split(' | ');
      const [action, actor, adjective] = keys.trim().split(/\s+/);

      switch (action) {
        case 'show':
          store.setBackground(actor);
          break;
        case 'enter':
          store.setPortrait({ character: actor, emotion: adjective });
          break;
        case 'foreground':
          store.setForeground(actor === 'none' ? null : actor);
          break;
        case 'play':
          this.playSong(actor);
          break;
        case 'says':
        case 'announce':
          store.setMessage({ actor: action === 'says' ? actor : '', text: value });
          this.dialogueAdvanceSound?.play();
          store.setLineIndex(i);
          return;
        case 'display':
          store.setAnimeText({ actor: '', text: value });
          this.dialogueAdvanceSound?.play();
          store.setLineIndex(i);
          return;
        case 'choose':
          store.setChoices(value.split(' ~ ').map((pair) => {
            const [newScriptKey, displayText] = pair.split(' * ');
            return { newScriptKey, displayText };
          }));
          store.setLineIndex(i);
          return;
      }
    }

    this.music?.stop();
    store.setLeaving();
  }

  private addSound(key: string): Phaser.Sound.BaseSound | undefined {
    return this.cache.audio.exists(key) ? this.sound.add(key) : undefined;
  }

  private playSong(songKey: string): void {
    this.music?.stop();
    this.music = this.addSound(songKey);
    this.music?.play({ loop: true });
  }
}
