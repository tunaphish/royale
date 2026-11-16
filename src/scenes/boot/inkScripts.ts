import { Compiler } from 'inkjs/compiler/Compiler';
import { CompilerOptions } from 'inkjs/compiler/CompilerOptions';
import { JsonFileHandler } from 'inkjs/compiler/FileHandler/JsonFileHandler';
import { Story } from 'inkjs/engine/Story';
import { ErrorType } from 'inkjs/engine/Error';

/** Ink scripts in public/scripts, loaded into Phaser's text cache by Boot. */
export const INK_SCRIPTS = ['final-battle'];

/**
 * Ink files that stories pull in with `INCLUDE <file>`. Loaded by Boot into
 * the text cache under `ink-include:<file>`.
 */
export const INK_INCLUDES = ['game.ink'];

export const inkScriptUrl = (key: string): string => `/royale/scripts/${key}.ink`;
export const inkIncludeUrl = (file: string): string => `/royale/scripts/${file}`;
export const inkIncludeKey = (file: string): string => `ink-include:${file}`;

/**
 * Compiles every ink script once, after Boot has loaded them, and keeps the
 * compiled JSON in Phaser's json cache under the same key.
 * Throws on compile errors, so a broken script fails at load time.
 */
export const compileInkScripts = (cache: Phaser.Cache.CacheManager): void => {
  const includes = Object.fromEntries(
    INK_INCLUDES.map((file) => [file, cache.text.get(inkIncludeKey(file))]),
  );
  const options = new CompilerOptions(null, [], false, null, new JsonFileHandler(includes));

  INK_SCRIPTS.forEach((key) => {
    const compiler = new Compiler(cache.text.get(key), options);
    const story = compiler.Compile();

    compiler.warnings.forEach((warning) => console.warn(`[ink:${key}] ${warning}`));
    if (compiler.errors.length > 0) {
      throw new Error(`[ink:${key}] ${compiler.errors.join('\n')}`);
    }

    cache.json.add(key, story.ToJson());
  });
};

/**
 * Creates a fresh playthrough of a compiled story.
 * Runtime problems (like a divert to a missing knot) are logged instead of thrown.
 */
export const createStory = (cache: Phaser.Cache.CacheManager, key: string): Story => {
  const json = cache.json.get(key);
  if (!json) {
    throw new Error(`[ink:${key}] no compiled story; is it listed in INK_SCRIPTS?`);
  }

  const story = new Story(json);
  story.onError = (message, type) => {
    if (type === ErrorType.Error) {
      console.error(`[ink:${key}] ${message}`);
    } else {
      console.warn(`[ink:${key}] ${message}`);
    }
  };

  return story;
};
