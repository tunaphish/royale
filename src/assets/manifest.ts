/**
 * Every asset in src/assets, found by Vite at build time. Dropping a file in
 * the right folder is enough to load it; there are no lists to keep.
 *
 * Keys:
 * - Audio (sfx, music): the file name without extension, e.g. `attack`, `knight`.
 * - Images: the path under images/ without extension, e.g. `backgrounds/supermarket`,
 *   `characters/thief`, `ui/icons/attack`.
 * - Ink stories: the file name in scripts/stories/ without extension, e.g. `final-battle`.
 * - Ink includes: the file name in scripts/, e.g. `game.ink`.
 */

type UrlGlob = Record<string, string>;

/** Maps glob paths to keys: strips `root` and, unless `keepExtension`, the extension. Throws on duplicate keys. */
const byKey = (files: UrlGlob, root: string, keepExtension = false): Record<string, string> => {
  const result: Record<string, string> = {};
  const sources: Record<string, string> = {};
  Object.entries(files).forEach(([path, value]) => {
    const relative = path.slice(root.length);
    const key = keepExtension ? relative : relative.replace(/\.[^./]+$/, '');
    if (key in result) {
      throw new Error(`[assets] "${key}" is used by both ${sources[key]} and ${path}`);
    }
    result[key] = value;
    sources[key] = path;
  });
  return result;
};

export const SFX = byKey(
  import.meta.glob<string>('./audio/sfx/*.{mp3,wav,ogg}', { eager: true, query: '?url', import: 'default' }),
  './audio/sfx/',
);

export const MUSIC = byKey(
  import.meta.glob<string>('./audio/music/*.{mp3,wav,ogg}', { eager: true, query: '?url', import: 'default' }),
  './audio/music/',
);

export const IMAGES = byKey(
  import.meta.glob<string>('./images/**/*.{png,jpg,jpeg,webp}', { eager: true, query: '?url', import: 'default' }),
  './images/',
);

/** Ink story sources, keyed by story key. */
export const INK_STORIES = byKey(
  import.meta.glob<string>('./scripts/stories/*.ink', { eager: true, query: '?raw', import: 'default' }),
  './scripts/stories/',
);

/** Ink files stories pull in with `INCLUDE <file>`, keyed by file name. */
export const INK_INCLUDES = byKey(
  import.meta.glob<string>('./scripts/*.ink', { eager: true, query: '?raw', import: 'default' }),
  './scripts/',
  true,
);

export const STORY_KEYS = Object.keys(INK_STORIES);

// Sfx and music share Phaser's audio cache, so their keys must not overlap.
Object.keys(MUSIC).forEach((key) => {
  if (key in SFX) throw new Error(`[assets] "${key}" is both a sound effect and a song`);
});

/** URL of an image by key, e.g. `imageUrl('backgrounds/supermarket')`. Warns when it doesn't exist. */
export const imageUrl = (key: string): string | undefined => {
  const url = IMAGES[key];
  if (!url) console.warn(`[assets] no image "${key}"`);
  return url;
};
