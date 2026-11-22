import type { Story } from 'inkjs/engine/Story';
import type { GameState } from '../../state/gameState';

/**
 * Connects the functions declared in src/assets/scripts/game.ink to the game's
 * state. Read-only functions are marked lookahead-safe so ink can evaluate
 * them early; functions that change state are not, so ink only calls them
 * when the line that contains them actually plays.
 */
export const bindGameFunctions = (story: Story, state: GameState): void => {
  story.BindExternalFunction('stat', (name: string) => state.stat(name), true);

  story.BindExternalFunction('flag', (name: string) => state.flag(name), true);

  story.BindExternalFunction(
    'set_flag',
    (name: string, value: boolean) => state.setFlag(name, value),
    false,
  );

  story.BindExternalFunction(
    'disposition',
    (student: string) => state.disposition(student),
    true,
  );

  story.BindExternalFunction(
    'add_disposition',
    (student: string, amount: number) => state.addDisposition(student, amount),
    false,
  );

  // The old names for disposition, kept so existing stories still work.
  story.BindExternalFunction(
    'relationship',
    (student: string) => state.disposition(student),
    true,
  );

  story.BindExternalFunction(
    'add_relationship',
    (student: string, amount: number) => state.addDisposition(student, amount),
    false,
  );

  story.BindExternalFunction(
    'mood',
    (student: string, mood: string) => state.hasMood(student, mood),
    true,
  );

  story.BindExternalFunction(
    'set_mood',
    (student: string, mood: string, slots: number) => state.setMood(student, mood, slots),
    false,
  );

  story.BindExternalFunction('has_star', (star: string) => state.hasStar(star), true);

  story.BindExternalFunction(
    'history',
    (student: string, event: string) => state.hasHistory(student, event),
    true,
  );
};
