import { makeAutoObservable } from 'mobx';

/** A line in the message box; `speaker` is a CHARACTERS key, or null for narration. */
export type Line = { speaker: string | null; text: string };
export type Choice = { index: number; text: string };

export type Portrait = { character: string; emotion?: string };

export class DialogueStore {
  // the script sets the stage with #bg / #enter; only the foreground has a default
  background: string | null = null;
  portrait: Portrait | null = null;
  foreground: string | null = 'https://raw.githubusercontent.com/oscicen/oscicen.github.io/master/img/depth-3.png';

  message: Line | null = null;
  displayText: string | null = null;
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

  setForeground(foreground: string | null): void {
    this.foreground = foreground;
  }

  setMessage(line: Line | null): void {
    this.message = line;
    this.choices = null;
  }

  setDisplayText(text: string): void {
    this.displayText = text;
  }

  setChoices(choices: Choice[] | null): void {
    this.choices = choices;
  }

  setLeaving(): void {
    this.isLeaving = true;
  }
}
