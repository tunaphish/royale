import type * as Phaser from 'phaser';
import { Compiler } from 'inkjs/compiler/Compiler';
import { CompilerOptions } from 'inkjs/compiler/CompilerOptions';
import { JsonFileHandler } from 'inkjs/compiler/FileHandler/JsonFileHandler';
import { Story } from 'inkjs/engine/Story';
import { ErrorType } from 'inkjs/engine/Error';

/**
 * Compiles ink stories, resolving `INCLUDE <file>` from `includes`.
 * Returns each story's compiled JSON under its key.
 * Throws on compile errors, so a broken story fails at load time.
 *
 * Plain function with no Phaser dependency, so it can run in Node.
 */
export const compileStories = (
  stories: Record<string, string>,
  includes: Record<string, string>,
): Record<string, string> => {
  const options = new CompilerOptions(null, [], false, null, new JsonFileHandler(includes));
  const compiled: Record<string, string> = {};

  Object.entries(stories).forEach(([key, source]) => {
    const compiler = new Compiler(source, options);

    // inkjs throws a bare "Compilation failed." when a story has errors, but
    // collects the real errors on the compiler first. Report those instead.
    let story: ReturnType<Compiler['Compile']> | null = null;
    let thrown: unknown = null;
    try {
      story = compiler.Compile();
    } catch (error) {
      thrown = error;
    }

    compiler.warnings.forEach((warning) => console.warn(`[ink:${key}] ${warning}`));
    if (compiler.errors.length > 0) {
      throw new Error(`[ink:${key}] ${compiler.errors.length} compile error(s):\n${compiler.errors.join('\n')}`);
    }
    if (thrown || !story) {
      throw new Error(`[ink:${key}] compile failed: ${thrown instanceof Error ? thrown.message : String(thrown)}`);
    }

    compiled[key] = story.ToJson() as string;
  });

  return compiled;
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
