import { Compiler } from 'inkjs/compiler/Compiler';
import { CompilerOptions } from 'inkjs/compiler/CompilerOptions';
import { JsonFileHandler } from 'inkjs/compiler/FileHandler/JsonFileHandler';
import { Story } from 'inkjs/engine/Story';
import { ErrorType } from 'inkjs/engine/Error';

import { INK_INCLUDES, INK_STORIES } from '../../assets/manifest';

/**
 * Compiles every ink story in src/assets/scripts/stories once, and keeps the
 * compiled JSON in Phaser's json cache under the story key.
 * Throws on compile errors, so a broken script fails at load time.
 */
export const compileInkScripts = (cache: Phaser.Cache.CacheManager): void => {
  const options = new CompilerOptions(null, [], false, null, new JsonFileHandler(INK_INCLUDES));

  Object.entries(INK_STORIES).forEach(([key, source]) => {
    const compiler = new Compiler(source, options);
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
    throw new Error(`[ink:${key}] no compiled story; is there a src/assets/scripts/stories/${key}.ink?`);
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
