import * as React from 'react';
import type { Story } from 'inkjs/engine/Story';
import ReactOverlay from '../../plugins/ReactOverlay';
import { DialogueView } from './DialogueView';
import { Choice, DialogueStore } from './dialogueStore';
import { createStory } from '../boot/inkScripts';
import { readNext, StoryStep } from './storyReader';

const sceneConfig: Phaser.Types.Scenes.SettingsConfig = {
  active: false,
  visible: false,
  key: 'Dialogue',
};

type DialogueData = { storyKey: string };

/**
 * A stage direction written in ink as a tag, e.g. `#enter eji angry`.
 * `params` names each argument; ones ending in `?` are optional.
 */
type Command = {
  params: string[];
  run: (args: string[]) => void;
};

export class Dialogue extends Phaser.Scene {
  reactOverlay: ReactOverlay;
  store: DialogueStore;

  private story: Story;
  private music?: Phaser.Sound.BaseSound;

  private readonly commands: Record<string, Command> = {
    bg: {
      params: ['background'],
      run: ([background]) => this.store.setBackground(background),
    },
    enter: {
      params: ['character', 'emotion?'],
      run: ([character, emotion]) => this.store.setPortrait({ character, emotion }),
    },
    foreground: {
      params: ['key|none'],
      run: ([key]) => this.store.setForeground(key === 'none' ? null : key),
    },
    play: {
      params: ['song'],
      run: ([song]) => this.playSong(song),
    },
  };

  constructor() {
    super(sceneConfig);
  }

  init(data: DialogueData): void {
    if (!data.storyKey) {
      throw new Error('[Dialogue] started without a storyKey');
    }
    this.story = createStory(this.cache, data.storyKey);
    this.store = new DialogueStore();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.stopMusic());
  }

  create(): void {
    this.reactOverlay.create(<DialogueView dialogue={this} />, this);
    this.continueStory();
  }

  // #region handle events
  advance(): void {
    const { store } = this;
    if (store.isLeaving || store.choices) return;

    this.continueStory();
  }

  selectChoice(choice: Choice): void {
    this.playSound('choice-select');
    this.store.setMessage(null);
    this.story.ChooseChoiceIndex(choice.index);
    this.continueStory();
  }

  leave(): void {
    this.scene.start('DialogueList');
  }
  // #endregion

  /** Reads the next step from ink, runs its stage directions, and shows it. */
  private continueStory(): void {
    const step = readNext(this.story);
    step.commands.forEach((tag) => this.runCommand(tag));
    this.showStep(step);
  }

  private showStep(step: StoryStep): void {
    const { store } = this;

    switch (step.kind) {
      case 'line':
        store.setMessage(step.line);
        this.playSound('window-advance');
        break;
      case 'display':
        store.setDisplayText(step.text);
        this.playSound('window-advance');
        break;
      case 'choices':
        store.setChoices(step.choices);
        break;
      case 'end':
        this.stopMusic();
        store.setLeaving();
        break;
    }
  }

  private runCommand(tag: string): void {
    const [name, ...args] = tag.split(/\s+/);
    const command = this.commands[name];

    if (!command) {
      console.warn(`[Dialogue] unknown tag: #${tag}`);
      return;
    }

    const required = command.params.filter((param) => !param.endsWith('?')).length;
    if (args.length < required || args.length > command.params.length) {
      console.warn(`[Dialogue] #${tag} expects: #${name} ${command.params.map((p) => `<${p}>`).join(' ')}`);
      return;
    }

    command.run(args);
  }

  /** One-off sounds; Phaser removes them once they finish playing. */
  private playSound(key: string): void {
    if (this.cache.audio.exists(key)) {
      this.sound.play(key);
    }
  }

  private playSong(songKey: string): void {
    this.stopMusic();
    if (!this.cache.audio.exists(songKey)) {
      console.warn(`[Dialogue] no song loaded with key: ${songKey}`);
      return;
    }
    this.music = this.sound.add(songKey, { loop: true });
    this.music.play();
  }

  private stopMusic(): void {
    this.music?.stop();
    this.music?.destroy();
    this.music = undefined;
  }
}
