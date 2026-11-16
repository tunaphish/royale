import type * as React from 'react';

/** One letter handed to a per-letter effect. */
export type Letter = {
  char: string;
  /** Position within the effect's phrase, starting at 0. */
  index: number;
  visible: boolean;
  /** Classes from `<span class="...">` tags inside the effect. */
  className?: string;
};

/** Effect that wraps its whole phrase, e.g. a pulse. */
export type WrapEffectProps = { children: React.ReactNode; className?: string };

/** Effect that renders each letter itself, e.g. Frenzy. */
export type PerLetterEffectProps = { letters: Letter[]; className?: string };

/**
 * Groups letters into words for per-letter effects. Render each word inside
 * a `white-space: nowrap` span so it can't break mid-word, and keep spaces as
 * plain text so lines can wrap between words.
 */
export const groupWords = (letters: Letter[]): (Letter[] | Letter)[] => {
  const groups: (Letter[] | Letter)[] = [];
  let word: Letter[] = [];
  letters.forEach((letter) => {
    if (/\s/.test(letter.char)) {
      if (word.length > 0) groups.push(word);
      word = [];
      groups.push(letter);
    } else {
      word.push(letter);
    }
  });
  if (word.length > 0) groups.push(word);
  return groups;
};
