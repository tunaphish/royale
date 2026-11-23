import * as Phaser from 'phaser';
import type { Story } from 'inkjs/engine/Story';
import { comparer, reaction } from 'mobx';
import { createStory } from '../../assets/ink';
import { SFX } from '../../assets/manifest';
import { DEFAULT_VOICE, Voice, VOICES } from '../../data/voices';
import type { FxSystem } from '../../fx/FxSystem';
import type { FxHandle } from '../../fx/FxHandle';
import type { FxTarget } from '../../fx/types';
import { CHARACTER_PARTS, parseTag, type StageCommand } from '../../model/storyTags';
import type GameSession from '../../plugins/GameSession';
import type { Stage } from '../../stage/Stage';
import { parseMarkup, plainText } from '../ui/markup';
import { bindGameFunctions } from './inkBindings';
import { Choice, Line, StoryStore, TypingTarget } from './storyStore';
import { TAG_ASSETS } from './tagAssets';

/** A scene a story can play in: it has FX and the game session. */
export type StoryHost = Phaser.Scene & { fx: FxSystem; session: GameSession };

/** How long `#ambience` loops take to fade in and out. */
const AMBIENCE_FADE_MS = 1000;
/** How long the lights take to go back to `flat` after a story, in `reset`. */
const RESET_FADE_MS = 500;

/**
 * Typewriter speed: time per letter, plus a pause after punctuation that ends
 * a phrase, at normal text speed. The `textSpeed` setting divides both.
 */
export const LETTER_MS = 30;
const PUNCTUATION_PAUSE_MS: Record<string, number> = {
  '.': 250, '!': 250, '?': 250, '…': 250,
  ',': 120, ';': 120, ':': 120,
};

/** Delay before the next letter, once `revealed` letters show. Pauses only at the end of a run like `...`. */
const letterDelay = (text: string, revealed: number, speed: number): number => {
  const last = text[revealed - 1];
  const next = text[revealed];
  const endsRun = next === undefined || /\s/.test(next);
  return (LETTER_MS + (endsRun ? PUNCTUATION_PAUSE_MS[last] ?? 0 : 0)) / speed;
};

/** Parses a line's markup, warning about mistakes like an unclosed tag. */
export const toLine = (text: string): Line => {
  const { nodes, problems } = parseMarkup(text);
  problems.forEach((problem) => console.warn(`[story] ${problem} in: ${text}`));
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
 * One thing the player does, read from ink in script order. Stage directions
 * (tags, parsed by `model/storyTags.ts`) run straight away; the rest block until
 * the player advances or picks a choice, so they always come last in a batch.
 */
type Command =
  | StageCommand
  | { kind: 'line'; text: string; voice?: string }
  | { kind: 'display'; text: string; voice?: string }
  | { kind: 'choices'; choices: Choice[] }
  | { kind: 'end' };

/**
 * Plays ink stories on a scene's stage and message box: lines typed out with
 * voices, choices, and tags (pictures, sounds, FX, lighting). Any scene with
 * a `Stage` can use one: Dialogue plays a single story; School plays star and
 * event scenes over the place they happen.
 *
 * `play` resolves when the story ends. Music and ambience stop then; the
 * stage and FX are left as the story left them until `reset`.
 */
export class StoryPlayer {
  readonly store: StoryStore;

  private story?: Story;
  private onEnd?: () => void;
  private music?: Phaser.Sound.BaseSound;
  /** Loops started by `#ambience`, by sound key. */
  private ambience = new Map<string, Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound>();
  private typingTimer?: Phaser.Time.TimerEvent;
  /** FX started by `#fx`, by ID, so `#fx <id> stop` can find them. */
  private runningFx = new Map<string, FxHandle[]>();

  /** Blip state for the line being typed. */
  private voice: Voice | null = null;
  private blipCount = 0;
  private lastBlipAt = -Infinity;
  private lastBlipSound?: string;

  constructor(private scene: StoryHost, readonly stage: Stage, store = new StoryStore()) {
    this.store = store;
    this.warnMissingVoiceSounds();
    const stops = this.syncStage();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      stops.forEach((stop) => stop());
      this.typingTimer?.remove();
      this.stopMusic();
      this.stopAmbience(undefined, true);
    });
  }

  get playing(): boolean {
    return this.store.playing;
  }

  /** Plays a story from the top. Resolves when it ends. */
  play(storyKey: string): Promise<void> {
    this.story = createStory(this.scene.cache, storyKey);
    bindGameFunctions(this.story, this.scene.session.state);
    this.store.clearText();
    this.store.setPlaying(true);
    return new Promise((resolve) => {
      this.onEnd = resolve;
      this.continueStory();
    });
  }

  /**
   * Puts things back after a story, for screens that carry on afterwards:
   * stops its FX and sounds, fades the lights back to `flat`, clears the
   * foreground and the text. The background and character are the caller's.
   */
  reset(): void {
    this.finishTyping();
    this.stopFx();
    this.stopMusic();
    this.stopAmbience();
    this.scene.fx.setMood('flat', { fade: RESET_FADE_MS });
    this.store.setForeground(null);
    this.store.clearText();
  }

  // #region Player input
  advance(): void {
    const { store } = this;
    if (!store.playing || store.choices) return;

    // a tap while a line is typing finishes the line; the next tap continues
    if (store.typing) {
      this.finishTyping();
      return;
    }

    this.playSound('window-advance');
    this.continueStory();
  }

  selectChoice(choice: Choice): void {
    if (!this.story || !this.store.playing) return;
    this.playSound('choice-select');
    this.store.setMessage(null);
    this.story.ChooseChoiceIndex(choice.index);
    this.continueStory();
  }
  // #endregion

  /** The store says what's on stage; the stage draws it. Returns the reactions' disposers. */
  private syncStage(): (() => void)[] {
    const { store, stage } = this;
    return [
      reaction(() => store.background, (bg) => stage.setBackground(bg), { fireImmediately: true }),
      // the same character and emotion again doesn't re-enter (or fade in again)
      reaction(() => store.portrait, (portrait) => stage.setPortrait(portrait), { fireImmediately: true, equals: comparer.structural }),
      reaction(
        () => [store.foreground, store.foregroundBacklit] as const,
        ([foreground, backlit]) => stage.setForeground(foreground, { backlit }),
        { fireImmediately: true, equals: comparer.structural },
      ),
    ];
  }

  /** Reads ink up to the next blocking moment, then runs what it found. */
  private continueStory(): void {
    this.collectCommands().forEach((command) => this.runCommand(command));
  }

  /**
   * Reads ink until the next line, choices or the end, keeping every tag on
   * the way as a command. The blocking command is always last.
   */
  private collectCommands(): Command[] {
    const story = this.story!;
    const commands: Command[] = [];
    // #display and #voice apply to the next line of text, even from a tag-only line above it
    let display = false;
    let voice: string | undefined;

    while (story.canContinue) {
      const text = story.Continue()?.trim() ?? '';
      for (const tag of story.currentTags ?? []) {
        const result = parseTag(tag, TAG_ASSETS);
        if ('problem' in result) console.warn(`[story] ${result.problem}`);
        else if ('command' in result) commands.push(result.command);
        else if (result.modifier === 'display') display = true;
        else voice = result.voice;
      }

      if (!text) continue;

      commands.push(display ? { kind: 'display', text, voice } : { kind: 'line', text, voice });
      return commands;
    }

    const choices = story.currentChoices.map(({ index, text }) => ({ index, nodes: toLine(text).nodes }));
    commands.push(choices.length > 0 ? { kind: 'choices', choices } : { kind: 'end' });
    return commands;
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
        this.scene.fx.setMood(command.mood, { fade: command.fade });
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
        this.scene.sound.play(command.sound);
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
      case 'end': {
        // the end of a story is an autosave checkpoint
        this.stopMusic();
        this.stopAmbience();
        this.scene.session.save();
        store.setPlaying(false);
        const onEnd = this.onEnd;
        this.onEnd = undefined;
        onEnd?.();
        break;
      }
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
      else console.warn(`[story] #fx ${id} at ${at.character}: ${at.character} isn't on stage; playing in the middle`);
    }
    const handle = this.scene.fx.play(id, { duration, at: target });
    const handles = (this.runningFx.get(id) ?? []).filter((h) => !h.isFinished);
    this.runningFx.set(id, [...handles, handle]);
  }

  /** Stops one FX by ID (every copy of it running), or all of them, lights included. */
  private stopFx(id?: string): void {
    if (!id) {
      this.scene.fx.stopAll();
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
      this.typingTimer = this.scene.time.delayedCall(letterDelay(text, revealed, this.textSpeed), typeNext);
    };
    this.typingTimer = this.scene.time.delayedCall(LETTER_MS / this.textSpeed, typeNext);
  }

  /** The `textSpeed` setting, read per letter so a change applies straight away. */
  private get textSpeed(): number {
    return Math.max(0.1, this.scene.session.settings.textSpeed);
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

    const now = this.scene.time.now;
    if (now - this.lastBlipAt < BLIP_MIN_GAP_MS) return;

    // a random sound, but not the same one twice in a row
    const { cache } = this.scene;
    const choices = voice.sounds.filter((key) => key !== this.lastBlipSound && cache.audio.exists(key));
    const sound = choices[Math.floor(Math.random() * choices.length)] ?? voice.sounds.find((key) => cache.audio.exists(key));
    if (!sound) return;

    this.scene.sound.play(sound, {
      detune: (voice.pitch ?? 0) + randomBetween(-BLIP_PITCH_JITTER, BLIP_PITCH_JITTER),
      volume: (voice.volume ?? BLIP_VOLUME) * randomBetween(1 - BLIP_VOLUME_JITTER, 1),
    });
    this.lastBlipAt = now;
    this.lastBlipSound = sound;
  }

  /** Warns once per player about voices that point at sounds that don't exist. */
  private warnMissingVoiceSounds(): void {
    Object.entries({ default: DEFAULT_VOICE, ...VOICES }).forEach(([key, voice]) => {
      voice.sounds
        .filter((sound) => !(sound in SFX))
        .forEach((sound) => console.warn(`[story] voice "${key}": no sound "${sound}" in src/assets/audio/sfx`));
    });
  }

  /** One-off sounds; Phaser removes them once they finish playing. */
  private playSound(key: string): void {
    if (this.scene.cache.audio.exists(key)) this.scene.sound.play(key);
  }

  private playSong(songKey: string): void {
    this.stopMusic();
    if (!this.scene.cache.audio.exists(songKey)) {
      console.warn(`[story] no song loaded with key: ${songKey}`);
      return;
    }
    this.music = this.scene.sound.add(songKey, { loop: true });
    this.music.play();
  }

  /** Starts a looping ambience sound, fading in. If it's already playing, fades to the new volume. */
  private playAmbience(key: string, volume: number): void {
    if (!this.scene.cache.audio.exists(key)) {
      console.warn(`[story] no sound loaded with key: ${key}`);
      return;
    }
    let sound = this.ambience.get(key);
    if (!sound) {
      sound = this.scene.sound.add(key, { loop: true, volume: 0 }) as Phaser.Sound.WebAudioSound;
      sound.play();
      this.ambience.set(key, sound);
    }
    this.scene.tweens.killTweensOf(sound);
    this.scene.tweens.add({ targets: sound, volume, duration: AMBIENCE_FADE_MS });
  }

  /** Fades out one ambience sound, or every one. `immediate` cuts them off (leaving the scene). */
  private stopAmbience(key?: string, immediate = false): void {
    const keys = key ? [key] : [...this.ambience.keys()];
    keys.forEach((k) => {
      const sound = this.ambience.get(k);
      if (!sound) return;
      this.ambience.delete(k);
      this.scene.tweens.killTweensOf(sound);
      const destroy = () => {
        sound.stop();
        sound.destroy();
      };
      if (immediate) destroy();
      else this.scene.tweens.add({ targets: sound, volume: 0, duration: AMBIENCE_FADE_MS, onComplete: destroy });
    });
  }

  private stopMusic(): void {
    this.music?.stop();
    this.music?.destroy();
    this.music = undefined;
  }
}
