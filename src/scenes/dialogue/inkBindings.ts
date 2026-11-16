import type { Story } from 'inkjs/engine/Story';
import type { GameState } from '../../state/gameState';

/**
 * Connects the functions declared in public/scripts/game.ink to the game's
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
    'relationship',
    (character: string) => state.relationship(character),
    true,
  );

  story.BindExternalFunction(
    'add_relationship',
    (character: string, amount: number) => state.addRelationship(character, amount),
    false,
  );
};


