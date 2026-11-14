import { makeAutoObservable } from 'mobx';

export type Line = { actor: string; text: string };
export type Choice = { newScriptKey: string; displayText: string };

export type Portrait = { character: string; emotion?: string };

export class DialogueStore {
  script: string[];
  lineIndex = -1;

  background: string | null = 'pikrepo';
  portrait: Portrait | null = { character: 'eji' };
  foreground: string | null = 'https://raw.githubusercontent.com/oscicen/oscicen.github.io/master/img/depth-3.png';

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

  setBackground(background: string | null): void {
    this.background = background;
  }

  setPortrait(portrait: Portrait | null): void {
    this.portrait = portrait;
  }

  setForeground(foreground: string | null): void {
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
