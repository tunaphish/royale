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

const sceneConfig: Phaser.Types.Scenes.SettingsConfig = {
  active: false,
  visible: false,
  key: 'Dialogue',
};

type DialogueData = { storyKey: string };

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

/** Tags that change the line they're on instead of becoming commands of their own. */
const DISPLAY_TAG = 'display';
const VOICE_TAG = 'voice';

const tagName = (tag: string): string => tag.split(/\s+/)[0];
const isLineModifier = (tag: string): boolean => tag === DISPLAY_TAG || tagName(tag) === VOICE_TAG;

/** Reads `#voice <key|none>` from a line's tags. Unknown keys warn and fall back to the default voice. */
const readVoice = (tags: string[]): string | undefined => {
  const tag = tags.find((t) => tagName(t) === VOICE_TAG);
  if (!tag) return undefined;

  const [, key, ...extra] = tag.split(/\s+/);
  if (!key || extra.length > 0) {
    console.warn(`[Dialogue] #${tag} expects: #voice <key|none>`);
    return undefined;
  }
  if (key !== 'none' && !(key in VOICES)) {
    console.warn(`[Dialogue] #${tag}: no voice "${key}" in data/voices.ts; using the default voice`);
  }
  return key;
};

/** The voice for a key: `none` is silent, and keys without an entry use the default. */
const resolveVoice = (key: string | undefined): Voice | null =>
  key === 'none' ? null : (key && VOICES[key]) || DEFAULT_VOICE;

/**
 * One thing the scene does, read from ink in script order.
 * Stage directions (`bg`, `enter`, `foreground`, `music`, `sfx`) run straight away;
 * the rest block until the player advances or picks a choice, so they always
 * come last in a batch.
 */
type Command =
  | { kind: 'bg'; background: string }
  | { kind: 'enter'; character: string; emotion?: string }
  | { kind: 'foreground'; foreground: string | null }
  | { kind: 'music'; song: string }
  | { kind: 'sfx'; sound: string }
  | { kind: 'line'; text: string; voice?: string }
  | { kind: 'display'; text: string; voice?: string }
  | { kind: 'choices'; choices: Choice[] }
  | { kind: 'end' };

/**
 * Turns a stage-direction tag like `enter eji angry` into a command.
 * Warns and returns null for unknown tags or wrong arguments.
 */
const parseTag = (tag: string): Command | null => {
  const [name, ...args] = tag.split(/\s+/);

  const expects = (usage: string, min: number, max = min): boolean => {
    if (args.length >= min && args.length <= max) return true;
    console.warn(`[Dialogue] #${tag} expects: ${usage}`);
    return false;
  };

  switch (name) {
    case 'bg':
      return expects('#bg <background>', 1)
        ? { kind: 'bg', background: args[0] }
        : null;
    case 'enter':
      return expects('#enter <character> [emotion]', 1, 2)
        ? { kind: 'enter', character: args[0], emotion: args[1] }
        : null;
    case 'foreground':
      return expects('#foreground <key|none>', 1)
        ? { kind: 'foreground', foreground: args[0] === 'none' ? null : args[0] }
        : null;
    case 'music':
      return expects('#music <song>', 1)
        ? { kind: 'music', song: args[0] }
        : null;
    case 'sfx':
      if (!expects('#sfx <sound>', 1)) return null;
      if (!(args[0] in SFX)) {
        console.warn(`[Dialogue] #${tag}: no sound "${args[0]}" in src/assets/audio/sfx`);
        return null;
      }
      return { kind: 'sfx', sound: args[0] };
    default:
      console.warn(`[Dialogue] unknown tag: #${tag}`);
      return null;
  }
};

export class Dialogue extends Phaser.Scene {
  reactOverlay: ReactOverlay;
  session: GameSession;
  store: DialogueStore;

  private story: Story;
  private music?: Phaser.Sound.BaseSound;
  private typingTimer?: Phaser.Time.TimerEvent;

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
    this.warnMissingVoiceSounds();

    // leaving the scene is an autosave checkpoint, for anything ink changed
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.session.save();
      this.stopMusic();
    });
  }

  create(): void {
    this.reactOverlay.create(<DialogueView dialogue={this} />, this);
    this.continueStory();
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
    this.scene.start('DialogueList');
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
    // modifier tags (#display, #voice) apply to the next line of text, even from a tag-only line above it
    const modifiers: string[] = [];

    while (this.story.canContinue) {
      const text = this.story.Continue()?.trim() ?? '';
      const tags = (this.story.currentTags ?? []).map((tag) => tag.trim());

      modifiers.push(...tags.filter(isLineModifier));
      tags
        .filter((tag) => !isLineModifier(tag))
        .map(parseTag)
        .forEach((command) => command && commands.push(command));

      if (!text) continue;

      const voice = readVoice(modifiers);
      commands.push(modifiers.includes(DISPLAY_TAG) ? { kind: 'display', text, voice } : { kind: 'line', text, voice });
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
        store.setPortrait({ character: command.character, emotion: command.emotion });
        break;
      case 'foreground':
        store.setForeground(command.foreground);
        break;
      case 'music':
        this.playSong(command.song);
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
        this.session.save();
        store.setLeaving();
        break;
    }
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

  private stopMusic(): void {
    this.music?.stop();
    this.music?.destroy();
    this.music = undefined;
  }
}
