import type { Story } from 'inkjs/engine/Story';
import { CHARACTERS } from './characters';
import { Choice, Line } from './dialogueStore';

/** Tag that marks a line as large text over the stage instead of the message box. */
const DISPLAY_TAG = 'display';

/**
 * The next thing the player should see. `commands` are the stage-direction
 * tags collected on the way there, in script order, to run before showing it.
 */
export type StoryStep =
  | { kind: 'line'; line: Line; commands: string[] }
  | { kind: 'display'; text: string; commands: string[] }
  | { kind: 'choices'; choices: Choice[]; commands: string[] }
  | { kind: 'end'; commands: string[] };

/**
 * Advances the story to the next thing to show the player.
 * Tag-only lines are skipped, but their tags are kept in `commands`.
 * Knows nothing about Phaser or React, so it can be tested on its own.
 */
export const readNext = (story: Story): StoryStep => {
  const commands: string[] = [];

  while (story.canContinue) {
    const text = story.Continue()?.trim() ?? '';
    const tags = (story.currentTags ?? []).map((tag) => tag.trim());
    const isDisplay = tags.includes(DISPLAY_TAG);

    commands.push(...tags.filter((tag) => tag !== DISPLAY_TAG));

    if (!text) continue;

    return isDisplay
      ? { kind: 'display', text, commands }
      : { kind: 'line', line: parseLine(text), commands };
  }

  if (story.currentChoices.length > 0) {
    const choices = story.currentChoices.map(({ index, text }) => ({ index, text }));
    return { kind: 'choices', choices, commands };
  }

  return { kind: 'end', commands };
};

/** `eji: some text` is spoken by eji if eji is in CHARACTERS; anything else is narration. */
export const parseLine = (text: string): Line => {
  const colon = text.indexOf(':');
  const speaker = colon > 0 ? text.slice(0, colon).trim().toLowerCase() : '';

  if (speaker in CHARACTERS) {
    return { speaker, text: text.slice(colon + 1).trim() };
  }
  return { speaker: null, text };
};
