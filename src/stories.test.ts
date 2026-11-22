import { describe, expect, it } from 'vitest';
import { INK_INCLUDES, INK_STORIES } from './assets/manifest';
import { compileStories } from './assets/ink';
import { checkStory } from './model/storyTags';
import { TAG_ASSETS } from './scenes/dialogue/tagAssets';

/**
 * Every story in src/assets/scripts/stories: it compiles, and every tag in it
 * refers to things that exist. The same checks Boot runs when the game starts,
 * so a broken story fails here before anyone opens the game.
 */
describe.each(Object.keys(INK_STORIES))('story "%s"', (key) => {
  it('compiles', () => {
    expect(() => compileStories({ [key]: INK_STORIES[key] }, INK_INCLUDES)).not.toThrow();
  });

  it('has no tag problems', () => {
    expect(checkStory(key, INK_STORIES[key], TAG_ASSETS)).toEqual([]);
  });
});
