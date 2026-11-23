import { describe, expect, it } from 'vitest';
import { Story } from 'inkjs/engine/Story';
import { INK_INCLUDES } from '../../assets/manifest';
import { compileStories } from '../../assets/ink';
import { GameState } from '../../state/gameState';
import { newGameState } from '../../data/new-game';
import { bindGameFunctions } from './inkBindings';

/** Compiles a story against the real game.ink, binds it to a fresh game and plays it to the end. */
const play = (source: string, state = new GameState(newGameState())) => {
  const { test } = compileStories({ test: `INCLUDE game.ink\n${source}` }, INK_INCLUDES);
  const story = new Story(test);
  bindGameFunctions(story, state);
  const text = story.ContinueMaximally().trim();
  return { state, text };
};

describe('game.ink bindings', () => {
  it('reads and changes dispositions, old names included', () => {
    const { state, text } = play(`
~ add_disposition("rena", 3)
~ add_relationship("rena", 1)
{disposition("rena")} {relationship("rena")}
`);
    expect(state.disposition('rena')).toBe(4);
    expect(text).toBe('4 4');
  });

  it('sets and reads moods', () => {
    const { state, text } = play(`
~ set_mood("thief", "furious", 3)
{ mood("thief", "furious"): yes | no } { mood("thief", "grateful"): yes | no }
`);
    expect(state.hasMood('thief', 'furious')).toBe(true);
    expect(text).toBe('yes no');
  });

  it('reads stars and history', () => {
    const state = new GameState(newGameState());
    state.lightStar('witch-fire');
    state.addHistory('witch', 'spared');
    const { text } = play(
      `{ has_star("witch-fire"): lit | dim } { history("witch", "spared"): spared | no } { history("witch", "humiliated"): humiliated | no }`,
      state,
    );
    expect(text).toBe('lit spared no');
  });
});
