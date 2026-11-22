import { makeAutoObservable } from 'mobx';

import type { MarkupNode } from '../ui/markup';

/** A line of text from ink, parsed for markup like `<frenzy>`. */
export type Line = { text: string; nodes: MarkupNode[] };
export type Choice = { index: number; nodes: MarkupNode[] };

/** Where the line being typed out is shown. */
export type TypingTarget = 'message' | 'display';

/** The line being typed out: `revealed` of its `length` letters show. */
export type Typing = { target: TypingTarget; revealed: number; length: number };

export type Portrait = { character: string; emotion?: string };

export class DialogueStore {
  // the script sets the whole stage with #bg / #enter / #foreground
  background: string | null = null;
  portrait: Portrait | null = null;
  foreground: string | null = null;
  /** Draw the foreground lit from behind (`#foreground <key> backlit`). */
  foregroundBacklit = false;

  message: Line | null = null;
  display: Line | null = null;
  typing: Typing | null = null;
  choices: Choice[] | null = null;

  isLeaving = false;

  constructor() {
    makeAutoObservable(this);
  }

  setBackground(background: string | null): void {
    this.background = background;
  }

  setPortrait(portrait: Portrait | null): void {
    this.portrait = portrait;
  }

  setForeground(foreground: string | null, backlit = false): void {
    this.foreground = foreground;
    this.foregroundBacklit = backlit;
  }

  setMessage(line: Line | null): void {
    this.message = line;
    this.choices = null;
  }

  setDisplay(line: Line | null): void {
    this.display = line;
  }

  setTyping(typing: Typing | null): void {
    this.typing = typing;
  }

  setRevealed(revealed: number): void {
    if (this.typing) this.typing.revealed = revealed;
  }

  setChoices(choices: Choice[] | null): void {
    this.choices = choices;
  }

  setLeaving(): void {
    this.isLeaving = true;
  }
}
