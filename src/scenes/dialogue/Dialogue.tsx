import * as Phaser from 'phaser';
import * as React from 'react';
import type { Story } from 'inkjs/engine/Story';
import ReactOverlay from '../../plugins/ReactOverlay';
import { DialogueView } from './DialogueView';
import { Choice, DialogueStore, Line, TypingTarget } from './dialogueStore';
import { parseMarkup, plainText } from '../ui/markup';
import { createStory } from '../../assets/ink';
import { bindGameFunctions } from './inkBindings';
import { SFX } from '../../assets/manifest';
import { DEFAULT_VOICE, Voice, VOICES } from '../../data/voices';
import GameSession from '../../plugins/GameSession';
import { comparer, reaction } from 'mobx';
import type { FxSystem } from '../../fx/FxSystem';
import type { FxHandle } from '../../fx/FxHandle';
import type { FxTarget } from '../../fx/types';
import { CHARACTER_PARTS, parseTag, type StageCommand } from '../../model/storyTags';
import { TAG_ASSETS } from './tagAssets';
import { Stage } from '../../stage/Stage';
import { addCrt } from '../../fx/crt';

const sceneConfig: Phaser.Types.Scenes.SettingsConfig = {
  active: false,
  visible: false,
  key: 'Dialogue',
};

/**
 * `crt` (any value, e.g. `?scene=Dialogue&storyKey=final-battle&crt`) tests the CRT TV filter over the stage.
 * `returnTo` is the scene to start when the story ends (the story list if left out), with `returnData` as its data.
 */
export type DialogueData = { storyKey: string; crt?: string; returnTo?: string; returnData?: object };

/** How long the stage takes to fade in and out, matching the UI's fade. */
const FADE_MS = 1000;
/** How long `#ambience` loops take to fade in and out. */
const AMBIENCE_FADE_MS = 1000;

/** Typewriter speed: time per letter, plus a pause after punctuation that ends a phrase. */
const LETTER_MS = 30;
const PUNCTUATION_PAUSE_MS: Record<string, number> = {
  '.': 250, '!': 250, '?': 250, '…': 250,
  ',': 120, ';': 120, ':': 120,
};

/** Delay before the next letter, once `revealed` letters show. Pauses only at the end of a run like `...`. */
const letterDelay = (text: string, revealed: number): number => {
  const last = text[revealed - 1];
  const next = text[revealed];
  const endsRun = next === undefined || /\s/.test(next);
  return LETTER_MS + (endsRun ? PUNCTUATION_PAUSE_MS[last] ?? 0 : 0);
};

/** Parses a line's markup, warning about mistakes like an unclosed tag. */
const toLine = (text: string): Line => {
  const { nodes, problems } = parseMarkup(text);
  problems.forEach((problem) => console.warn(`[Dialogue] ${problem} in: ${text}`));
  return { text, nodes };
};

/**
 * Blips while typing. Only letters and digits blip, and only every
 * BLIP_EVERY of them, at least BLIP_MIN_GAP_MS apart. Each blip's pitch and
 * volume vary a little so a long line doesn't sound like one repeated beep.
 */
const BLIP_EVERY = 2;
const BLIP_MIN_GAP_MS = 60;
const BLIP_PITCH_JITTER = 80;
const BLIP_VOLUME = 0.5;
const BLIP_VOLUME_JITTER = 0.15;

const randomBetween = (min: number, max: number): number => min + Math.random() * (max - min);

/** The voice for a key: `none` is silent, and keys without an entry use the default. */
const resolveVoice = (key: string | undefined): Voice | null =>
  key === 'none' ? null : (key && VOICES[key]) || DEFAULT_VOICE;

/**
 * One thing the scene does, read from ink in script order. Stage directions
 * (tags, parsed by `model/storyTags.ts`) run straight away; the rest block until
 * the player advances or picks a choice, so they always come last in a batch.
 */
type Command =
  | StageCommand
  | { kind: 'line'; text: string; voice?: string }
  | { kind: 'display'; text: string; voice?: string }
  | { kind: 'choices'; choices: Choice[] }
  | { kind: 'end' };

export class Dialogue extends Phaser.Scene {
  reactOverlay: ReactOverlay;
  session: GameSession;
  fx: FxSystem;
  store: DialogueStore;
  /** Background, character and foreground, drawn and lit in Phaser. The view reports where it is. */
  stage: Stage;

  private story: Story;
  private music?: Phaser.Sound.BaseSound;
  /** Loops started by `#ambience`, by sound key. */
  private ambience = new Map<string, Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound>();
  private typingTimer?: Phaser.Time.TimerEvent;
  /** FX started by `#fx`, by ID, so `#fx <id> stop` can find them. */
  private runningFx = new Map<string, FxHandle[]>();
  private crt = false;
  private returnTo = 'DialogueList';
  private returnData?: object;

  /** Blip state for the line being typed. */
  private voice: Voice | null = null;
  private blipCount = 0;
  private lastBlipAt = -Infinity;
  private lastBlipSound?: string;

  constructor() {
    super(sceneConfig);
  }

  init(data: DialogueData): void {
    if (!data.storyKey) {
      throw new Error('[Dialogue] started without a storyKey');
    }
    this.story = createStory(this.cache, data.storyKey);
    bindGameFunctions(this.story, this.session.state);
    this.store = new DialogueStore();
    this.crt = data.crt !== undefined;
    this.returnTo = data.returnTo ?? 'DialogueList';
    this.returnData = data.returnData;
    this.warnMissingVoiceSounds();

    // leaving the scene is an autosave checkpoint, for anything ink changed
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.session.save();
      this.stopMusic();
      this.stopAmbience(undefined, true);
    });
  }

  create(): void {
    this.runningFx.clear();
    this.stage = new Stage(this, this.fx);
    this.syncStage();
    if (this.crt) addCrt(this);
    this.cameras.main.fadeIn(FADE_MS);

    this.reactOverlay.create(<DialogueView dialogue={this} />, this);
    this.continueStory();
  }

  /** The store says what's on stage; the stage draws it. */
  private syncStage(): void {
    const { store, stage } = this;
    const stops = [
      reaction(() => store.background, (bg) => stage.setBackground(bg), { fireImmediately: true }),
      // the same character and emotion again doesn't re-enter (or fade in again)
      reaction(() => store.portrait, (portrait) => stage.setPortrait(portrait), { fireImmediately: true, equals: comparer.structural }),
      reaction(
        () => [store.foreground, store.foregroundBacklit] as const,
        ([foreground, backlit]) => stage.setForeground(foreground, { backlit }),
        { fireImmediately: true, equals: comparer.structural },
      ),
      // the UI fades out over the same time, then calls leave()
      reaction(() => store.isLeaving, (leaving) => leaving && this.cameras.main.fadeOut(FADE_MS)),
    ];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => stops.forEach((stop) => stop()));
  }

  // #region handle events
  advance(): void {
    const { store } = this;
    if (store.isLeaving || store.choices) return;

    // a tap while a line is typing finishes the line; the next tap continues
    if (store.typing) {
      this.finishTyping();
      return;
    }

    this.playSound('window-advance');
    this.continueStory();
  }

  selectChoice(choice: Choice): void {
    this.playSound('choice-select');
    this.store.setMessage(null);
    this.story.ChooseChoiceIndex(choice.index);
    this.continueStory();
  }

  leave(): void {
    this.scene.start(this.returnTo, this.returnData);
  }
  // #endregion

  /** Reads ink up to the next blocking moment, then runs what it found. */
  private continueStory(): void {
    const commands = this.collectCommands();
    this.runCommands(commands);
  }

  /**
   * Reads ink until the next line, choices or the end, keeping every tag on
   * the way as a command. The blocking command is always last.
   */
  private collectCommands(): Command[] {
    const commands: Command[] = [];
    // #display and #voice apply to the next line of text, even from a tag-only line above it
    let display = false;
    let voice: string | undefined;

    while (this.story.canContinue) {
      const text = this.story.Continue()?.trim() ?? '';
      for (const tag of this.story.currentTags ?? []) {
        const result = parseTag(tag, TAG_ASSETS);
        if ('problem' in result) console.warn(`[Dialogue] ${result.problem}`);
        else if ('command' in result) commands.push(result.command);
        else if (result.modifier === 'display') display = true;
        else voice = result.voice;
      }

      if (!text) continue;

      commands.push(display ? { kind: 'display', text, voice } : { kind: 'line', text, voice });
      return commands;
    }

    const choices = this.story.currentChoices.map(({ index, text }) => ({ index, nodes: toLine(text).nodes }));
    commands.push(choices.length > 0 ? { kind: 'choices', choices } : { kind: 'end' });
    return commands;
  }

  private runCommands(commands: Command[]): void {
    commands.forEach((command) => this.runCommand(command));
  }

  private runCommand(command: Command): void {
    const { store } = this;

    switch (command.kind) {
      case 'bg':
        store.setBackground(command.background);
        break;
      case 'enter':
        store.setPortrait(command.portrait);
        break;
      case 'foreground':
        store.setForeground(command.foreground, command.backlit);
        break;
      case 'fx':
        this.playFx(command);
        break;
      case 'fxStop':
        this.stopFx(command.id);
        break;
      case 'light':
        this.fx.setMood(command.mood, { fade: command.fade });
        break;
      case 'music':
        if (command.song) this.playSong(command.song);
        else this.stopMusic();
        break;
      case 'ambience':
        this.playAmbience(command.sound, command.volume);
        break;
      case 'ambienceStop':
        this.stopAmbience(command.sound);
        break;
      case 'sfx':
        this.sound.play(command.sound);
        break;
      case 'line': {
        const line = toLine(command.text);
        store.setMessage(line);
        // message box lines are the player speaking
        this.startTyping('message', line, resolveVoice(command.voice ?? 'player'));
        break;
      }
      case 'display': {
        const line = toLine(command.text);
        store.setDisplay(line);
        // display lines are the character on stage speaking
        this.startTyping('display', line, resolveVoice(command.voice ?? store.portrait?.character));
        break;
      }
      case 'choices':
        store.setChoices(command.choices);
        break;
      case 'end':
        // the end of a story is an autosave checkpoint
        this.stopMusic();
        this.stopAmbience();
        this.session.save();
        store.setLeaving();
        break;
    }
  }

  private playFx({ id, duration, at }: StageCommand & { kind: 'fx' }): void {
    let target: FxTarget | undefined;
    if (at && 'stage' in at) {
      target = at;
    } else if (at) {
      const follow = this.stage.characterImage(at.character);
      // a point on the portrait, e.g. its chest, as fractions of the image (x across, y down)
      if (follow) target = { follow, point: [0.5, CHARACTER_PARTS[at.part]] };
      else console.warn(`[Dialogue] #fx ${id} at ${at.character}: ${at.character} isn't on stage; playing in the middle`);
    }
    const handle = this.fx.play(id, { duration, at: target });
    const handles = (this.runningFx.get(id) ?? []).filter((h) => !h.isFinished);
    this.runningFx.set(id, [...handles, handle]);
  }

  /** Stops one FX by ID (every copy of it running), or all of them, lights included. */
  private stopFx(id?: string): void {
    if (!id) {
      this.fx.stopAll();
      this.runningFx.clear();
      return;
    }
    this.runningFx.get(id)?.forEach((handle) => handle.stop());
    this.runningFx.delete(id);
  }

  /** Types a line out one letter at a time; `finishTyping` shows the rest at once. */
  private startTyping(target: TypingTarget, line: Line, voice: Voice | null): void {
    this.typingTimer?.remove();
    this.voice = voice;
    this.blipCount = 0;
    const text = plainText(line.nodes);
    if (text.length === 0) {
      this.store.setTyping(null);
      return;
    }

    this.store.setTyping({ target, revealed: 0, length: text.length });

    const typeNext = () => {
      const revealed = (this.store.typing?.revealed ?? 0) + 1;
      if (revealed >= text.length) {
        this.finishTyping();
        return;
      }
      this.store.setRevealed(revealed);
      this.blip(text[revealed - 1]);
      this.typingTimer = this.time.delayedCall(letterDelay(text, revealed), typeNext);
    };
    this.typingTimer = this.time.delayedCall(LETTER_MS, typeNext);
  }

  private finishTyping(): void {
    this.typingTimer?.remove();
    this.typingTimer = undefined;
    this.store.setTyping(null);
  }

  /** Plays the line's voice for a newly revealed letter, if it should blip. */
  private blip(char: string): void {
    const { voice } = this;
    if (!voice || !/[\p{L}\p{N}]/u.test(char)) return;

    this.blipCount += 1;
    if ((this.blipCount - 1) % BLIP_EVERY !== 0) return;

    const now = this.time.now;
    if (now - this.lastBlipAt < BLIP_MIN_GAP_MS) return;

    // a random sound, but not the same one twice in a row
    const choices = voice.sounds.filter((key) => key !== this.lastBlipSound && this.cache.audio.exists(key));
    const sound = choices[Math.floor(Math.random() * choices.length)] ?? voice.sounds.find((key) => this.cache.audio.exists(key));
    if (!sound) return;

    this.sound.play(sound, {
      detune: (voice.pitch ?? 0) + randomBetween(-BLIP_PITCH_JITTER, BLIP_PITCH_JITTER),
      volume: (voice.volume ?? BLIP_VOLUME) * randomBetween(1 - BLIP_VOLUME_JITTER, 1),
    });
    this.lastBlipAt = now;
    this.lastBlipSound = sound;
  }

  /** Warns once per visit about voices that point at sounds that don't exist. */
  private warnMissingVoiceSounds(): void {
    Object.entries({ default: DEFAULT_VOICE, ...VOICES }).forEach(([key, voice]) => {
      voice.sounds
        .filter((sound) => !(sound in SFX))
        .forEach((sound) => console.warn(`[Dialogue] voice "${key}": no sound "${sound}" in src/assets/audio/sfx`));
    });
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

  /** Starts a looping ambience sound, fading in. If it's already playing, fades to the new volume. */
  private playAmbience(key: string, volume: number): void {
    if (!this.cache.audio.exists(key)) {
      console.warn(`[Dialogue] no sound loaded with key: ${key}`);
      return;
    }
    let sound = this.ambience.get(key);
    if (!sound) {
      sound = this.sound.add(key, { loop: true, volume: 0 }) as Phaser.Sound.WebAudioSound;
      sound.play();
      this.ambience.set(key, sound);
    }
    this.tweens.killTweensOf(sound);
    this.tweens.add({ targets: sound, volume, duration: AMBIENCE_FADE_MS });
  }

  /** Fades out one ambience sound, or every one. `immediate` cuts them off (leaving the scene). */
  private stopAmbience(key?: string, immediate = false): void {
    const keys = key ? [key] : [...this.ambience.keys()];
    keys.forEach((k) => {
      const sound = this.ambience.get(k);
      if (!sound) return;
      this.ambience.delete(k);
      this.tweens.killTweensOf(sound);
      const destroy = () => {
        sound.stop();
        sound.destroy();
      };
      if (immediate) destroy();
      else this.tweens.add({ targets: sound, volume: 0, duration: AMBIENCE_FADE_MS, onComplete: destroy });
    });
  }

  private stopMusic(): void {
    this.music?.stop();
    this.music?.destroy();
    this.music = undefined;
  }
}
