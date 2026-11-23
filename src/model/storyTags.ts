import type { Duration, StagePoint } from '../fx/types';

/**
 * Ink tags: parsing and checking. Plain functions with no Phaser, so the
 * Dialogue scene, the startup check of every story and tests all read tags
 * the same way.
 *
 * The rules writers see (`src/assets/scripts/AUTHORING.md`):
 * - Pictures are removed with `none`: `#bg none`, `#enter none`, `#foreground none`.
 * - Sounds and effects are stopped with `stop`: `#music stop`, `#ambience stop`, `#fx stop`.
 */

/** Named spots on the stage for `#fx <id> at <spot>`, as fractions of its size. */
export const STAGE_SPOTS: Record<string, StagePoint> = {
  center: [0.5, 0.5],
  top: [0.5, 0.1],
  bottom: [0.5, 0.95],
  left: [0.15, 0.5],
  right: [0.85, 0.5],
  'top-left': [0.15, 0.1],
  'top-right': [0.85, 0.1],
  'bottom-left': [0.15, 0.95],
  'bottom-right': [0.85, 0.95],
};

/** Parts of a character for `#fx <id> at <character> [part]`: how far down the portrait, 0 top to 1 bottom. */
export const CHARACTER_PARTS = { face: 0.2, chest: 0.45, feet: 1 } as const;
export type CharacterPart = keyof typeof CHARACTER_PARTS;
export const DEFAULT_PART: CharacterPart = 'chest';

/** Where an FX plays: on a character (following them), or at a stage point. */
export type FxPlace = { character: string; part: CharacterPart } | { stage: StagePoint };

/** Default fade for `#light`, in ms. */
export const LIGHT_FADE_MS = 500;

/** A stage direction: runs as soon as the story reaches it. */
export type StageCommand =
  | { kind: 'bg'; background: string | null }
  | { kind: 'enter'; portrait: { character: string; emotion?: string } | null }
  | { kind: 'foreground'; foreground: string | null; backlit: boolean }
  | { kind: 'fx'; id: string; duration?: Duration; at?: FxPlace }
  | { kind: 'fxStop'; id?: string }
  | { kind: 'light'; mood: string; fade: number }
  | { kind: 'music'; song: string | null }
  | { kind: 'ambience'; sound: string; volume: number }
  | { kind: 'ambienceStop'; sound?: string }
  | { kind: 'sfx'; sound: string };

/**
 * What exists, so tags can be checked against it. The scene and the startup
 * check build this from the asset manifest and `data/`.
 */
export interface TagAssets {
  /** An image key, e.g. `backgrounds/forest`, `characters/thief`. */
  image(key: string): boolean;
  /** A key in `audio/sfx`. */
  sound(key: string): boolean;
  /** A key in `audio/music`. */
  song(key: string): boolean;
  fx(id: string): boolean;
  mood(id: string): boolean;
  voice(key: string): boolean;
}

/** What a tag turned out to be. A tag with a problem does nothing. */
export type TagResult =
  | { command: StageCommand }
  | { modifier: 'display' }
  | { modifier: 'voice'; voice: string }
  | { problem: string };

const USAGE: Record<string, string> = {
  bg: '#bg <background|none>',
  enter: '#enter <character> [emotion], or #enter none',
  foreground: '#foreground <key|none> [backlit]',
  fx: '#fx <id> [ms|infinite] [at <character> [face|chest|feet] | at <spot> | at <x> <y>], #fx <id> stop, or #fx stop',
  light: '#light <mood> [fade ms]',
  music: '#music <song|stop>',
  ambience: '#ambience <sound> [volume 0-1], #ambience <sound> stop, or #ambience stop',
  sfx: '#sfx <sound>',
  voice: '#voice <key|none>',
  display: '#display',
};

/** Every tag name writers can use. */
export const TAG_NAMES = Object.keys(USAGE);

const isNumber = (word: string | undefined): boolean => word !== undefined && /^-?\d*\.?\d+$/.test(word);

/** Reads one tag (without its `#`), e.g. `enter thief angry`. */
export function parseTag(tag: string, assets: TagAssets): TagResult {
  const [name, ...args] = tag.trim().split(/\s+/);
  const problem = (text: string): TagResult => ({ problem: `#${tag}: ${text}. Expects: ${USAGE[name]}` });
  const count = (min: number, max = min): boolean => args.length >= min && args.length <= max;

  switch (name) {
    case 'display':
      return args.length === 0 ? { modifier: 'display' } : problem('nothing can follow #display');

    case 'voice': {
      if (!count(1)) return problem('needs one voice');
      const voice = args[0];
      if (voice !== 'none' && !assets.voice(voice)) return problem(`no voice "${voice}" in data/voices.ts`);
      return { modifier: 'voice', voice };
    }

    case 'bg': {
      if (!count(1)) return problem('needs one background');
      if (args[0] === 'none') return { command: { kind: 'bg', background: null } };
      if (!assets.image(`backgrounds/${args[0]}`)) return problem(`no image "${args[0]}" in images/backgrounds`);
      return { command: { kind: 'bg', background: args[0] } };
    }

    case 'enter': {
      if (!count(1, 2)) return problem('needs a character, and maybe an emotion');
      const [character, emotion] = args;
      if (character === 'none') {
        return emotion ? problem('nothing can follow "none"') : { command: { kind: 'enter', portrait: null } };
      }
      const file = `${character}${emotion ? `-${emotion}` : ''}`;
      if (!assets.image(`characters/${file}`)) return problem(`no image "${file}" in images/characters`);
      return { command: { kind: 'enter', portrait: { character, emotion } } };
    }

    case 'foreground': {
      if (!count(1, 2)) return problem('needs an image, or none');
      if (args[1] !== undefined && args[1] !== 'backlit') return problem('the second word can only be "backlit"');
      const [key] = args;
      if (key === 'none') {
        return args[1] ? problem('nothing can follow "none"') : { command: { kind: 'foreground', foreground: null, backlit: false } };
      }
      const isUrl = /^https?:/.test(key);
      if (!isUrl && !assets.image(`foregrounds/${key}`) && !assets.image(key)) {
        return problem(`no image "${key}" in images/foregrounds (or any image key)`);
      }
      return { command: { kind: 'foreground', foreground: key, backlit: args[1] === 'backlit' } };
    }

    case 'light': {
      if (!count(1, 2)) return problem('needs a mood, and maybe a fade time');
      if (!assets.mood(args[0])) return problem(`no mood "${args[0]}" in data/lighting.ts`);
      const fade = args[1] === undefined ? LIGHT_FADE_MS : Number(args[1]);
      if (!Number.isFinite(fade) || fade < 0) return problem('fade must be a number of ms');
      return { command: { kind: 'light', mood: args[0], fade } };
    }

    case 'music': {
      if (!count(1)) return problem('needs a song, or stop');
      if (args[0] === 'stop') return { command: { kind: 'music', song: null } };
      if (!assets.song(args[0])) return problem(`no song "${args[0]}" in audio/music`);
      return { command: { kind: 'music', song: args[0] } };
    }

    case 'sfx': {
      if (!count(1)) return problem('needs one sound');
      if (!assets.sound(args[0])) return problem(`no sound "${args[0]}" in audio/sfx`);
      return { command: { kind: 'sfx', sound: args[0] } };
    }

    case 'ambience': {
      const [sound, option] = args;
      if (!count(1, 2)) return problem('needs a sound, and maybe a volume or stop');
      if (sound === 'stop') return option === undefined ? { command: { kind: 'ambienceStop' } } : problem('nothing can follow "stop"');
      if (!assets.sound(sound) && !assets.song(sound)) return problem(`no sound "${sound}" in audio`);
      if (option === 'stop') return { command: { kind: 'ambienceStop', sound } };
      const volume = option === undefined ? 1 : Number(option);
      if (!Number.isFinite(volume) || volume < 0 || volume > 1) return problem('volume must be a number from 0 to 1');
      return { command: { kind: 'ambience', sound, volume } };
    }

    case 'fx':
      return parseFx(args, assets, problem);

    default:
      return { problem: `#${tag}: unknown tag. Tags: ${TAG_NAMES.map((t) => `#${t}`).join(', ')}` };
  }
}

function parseFx(args: string[], assets: TagAssets, problem: (text: string) => TagResult): TagResult {
  const [id, ...rest] = args;
  if (!id) return problem('needs an FX id');
  if (id === 'stop') return rest.length === 0 ? { command: { kind: 'fxStop' } } : problem('nothing can follow "stop"');
  if (!assets.fx(id)) return problem(`no FX "${id}" in data/fx.ts`);
  if (rest[0] === 'stop') return rest.length === 1 ? { command: { kind: 'fxStop', id } } : problem('nothing can follow "stop"');

  const command: StageCommand & { kind: 'fx' } = { kind: 'fx', id };
  for (let i = 0; i < rest.length; i++) {
    const word = rest[i];
    if (word === 'at') {
      const where = rest[i + 1];
      if (!where) return problem('"at" needs a character, a spot or x and y');
      if (isNumber(where) || isNumber(rest[i + 2])) {
        if (!isNumber(where) || !isNumber(rest[i + 2])) return problem('"at <x> <y>" needs two numbers');
        command.at = { stage: [Number(where), Number(rest[i + 2])] };
        i += 2;
      } else if (where in STAGE_SPOTS) {
        command.at = { stage: STAGE_SPOTS[where] };
        i += 1;
      } else {
        if (!assets.image(`characters/${where}`)) {
          return problem(`"${where}" isn't a spot (${Object.keys(STAGE_SPOTS).join(', ')}) or a character in images/characters`);
        }
        const part = rest[i + 2];
        if (part !== undefined && part in CHARACTER_PARTS) {
          command.at = { character: where, part: part as CharacterPart };
          i += 2;
        } else {
          command.at = { character: where, part: DEFAULT_PART };
          i += 1;
        }
      }
    } else if (word === 'infinite') {
      command.duration = 'infinite';
    } else if (/^\d+$/.test(word) && Number(word) > 0) {
      command.duration = Number(word);
    } else {
      return problem(`didn't understand "${word}"`);
    }
  }
  return { command };
}

/** A tag in a story's source, with its 1-based line number. */
export interface SourceTag {
  line: number;
  tag: string;
}

/**
 * Finds every tag in ink source, the way ink reads them: `#` starts a tag that
 * runs to the next `#` or the end of the line; `//` and block comments are
 * ignored, and `\#` is a plain `#`. Tags with `{` (dynamic tags) are skipped,
 * since their text is only known when the story runs.
 */
export function findTags(source: string): SourceTag[] {
  const found: SourceTag[] = [];
  let inBlockComment = false;
  source.split('\n').forEach((raw, index) => {
    let line = raw;
    if (inBlockComment) {
      const end = line.indexOf('*/');
      if (end < 0) return;
      line = line.slice(end + 2);
      inBlockComment = false;
    }
    line = line.replace(/\/\*.*?\*\//g, '');
    const blockStart = line.indexOf('/*');
    if (blockStart >= 0) {
      line = line.slice(0, blockStart);
      inBlockComment = true;
    }
    const comment = line.indexOf('//');
    if (comment >= 0) line = line.slice(0, comment);
    const parts = line.replace(/\\#/g, '').split('#');
    parts.slice(1).forEach((part) => {
      const tag = part.trim();
      if (tag && !tag.includes('{')) found.push({ line: index + 1, tag });
    });
  });
  return found;
}

/** A problem with a tag in a story. */
export interface TagProblem {
  story: string;
  line: number;
  problem: string;
}

/** Checks every tag in a story's source. */
export function checkStory(story: string, source: string, assets: TagAssets): TagProblem[] {
  const problems: TagProblem[] = [];
  for (const { line, tag } of findTags(source)) {
    const result = parseTag(tag, assets);
    if ('problem' in result) problems.push({ story, line, problem: result.problem });
  }
  return problems;
}
