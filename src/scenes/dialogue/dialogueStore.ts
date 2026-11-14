import { makeAutoObservable } from 'mobx';

export type TypedLine = { id: number; actor: string; text: string };
export type Choice = { newScriptKey: string; displayText: string };

export const DEFAULT_MIDDLEGROUND = 'url("/royale/characters/eji.png")';
export const DEFAULT_BACKGROUND = 'url("/royale/backgrounds/pikrepo.jpg")';

export class DialogueStore {
  script: string[];
  lineIndex = -1;

  background = DEFAULT_BACKGROUND;
  middleground = DEFAULT_MIDDLEGROUND;

  message: TypedLine | null = null;
  animeText: TypedLine | null = null;
  choices: Choice[] | null = null;

  // id of the line currently typing, and the id the player asked to skip
  animatingId: number | null = null;
  skipId: number | null = null;

  isLeaving = false;

  private nextId = 0;

  constructor(script: string[]) {
    this.script = script;
    makeAutoObservable(this);
  }

  createLine(actor: string, text: string): TypedLine {
    return { id: this.nextId++, actor, text };
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

  setMessage(line: TypedLine): void {
    this.message = line;
    this.choices = null;
    this.animatingId = line.id;
  }

  setAnimeText(line: TypedLine): void {
    this.animeText = line;
    this.animatingId = line.id;
  }

  setChoices(choices: Choice[]): void {
    this.choices = choices;
  }

  skipTyping(): void {
    this.skipId = this.animatingId;
  }

  finishTyping(id: number): void {
    if (this.animatingId === id) {
      this.animatingId = null;
    }
  }

  setLeaving(): void {
    this.isLeaving = true;
  }
}
