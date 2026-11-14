import { makeAutoObservable } from 'mobx';

export type Line = { actor: string; text: string };
export type Choice = { newScriptKey: string; displayText: string };

export const DEFAULT_MIDDLEGROUND = 'url("/royale/characters/eji.png")';
export const DEFAULT_BACKGROUND = 'url("/royale/backgrounds/pikrepo.jpg")';

export class DialogueStore {
  script: string[];
  lineIndex = -1;

  background = DEFAULT_BACKGROUND;
  middleground = DEFAULT_MIDDLEGROUND;
  foreground = 'url(https://raw.githubusercontent.com/oscicen/oscicen.github.io/master/img/depth-3.png)';

  message: Line | null = null;
  animeText: Line | null = null;
  choices: Choice[] | null = null;

  isLeaving = false;

  constructor(script: string[]) {
    this.script = script;
    makeAutoObservable(this);
  }

  setScript(script: string[]): void {
    this.script = script;
    this.message = null;
  }

  setLineIndex(lineIndex: number): void {
    this.lineIndex = lineIndex;
  }

  setBackground(background: string): void {
    this.background = background;
  }

  setMiddleground(middleground: string): void {
    this.middleground = middleground;
  }

  setForeground(foreground: string): void {
    this.foreground = foreground;
  }

  setMessage(line: Line): void {
    this.message = line;
    this.choices = null;
  }

  setAnimeText(line: Line): void {
    this.animeText = line;
  }

  setChoices(choices: Choice[]): void {
    this.choices = choices;
  }

  setLeaving(): void {
    this.isLeaving = true;
  }
}
