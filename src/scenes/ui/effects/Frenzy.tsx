import * as React from 'react';

import { groupWords, Letter, PerLetterEffectProps } from './letters';

/** How far each letter can jump, in pixels, and how often it jumps. */
const RANGE = 4;
const INTERVAL_MS = 50;

/**
 * Each letter jitters in its own random direction. One timer moves every
 * letter of the phrase by writing transforms directly, without re-rendering.
 */
export const Frenzy = ({ letters, className }: PerLetterEffectProps): JSX.Element => {
  const letterRefs = React.useRef<(HTMLSpanElement | null)[]>([]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      letterRefs.current.forEach((element) => {
        if (!element) return;
        const x = (Math.random() - 0.5) * RANGE;
        const y = (Math.random() - 0.5) * RANGE;
        element.style.transform = `translate(${x}px, ${y}px)`;
      });
    }, INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const renderLetter = (letter: Letter) => (
    <span
      key={letter.index}
      ref={(element) => { letterRefs.current[letter.index] = element; }}
      className={letter.className}
      style={{ display: 'inline-block', visibility: letter.visible ? 'visible' : 'hidden' }}
    >
      {letter.char}
    </span>
  );

  return (
    <span className={className}>
      {groupWords(letters).map((group) =>
        Array.isArray(group)
          ? <span key={`w${group[0].index}`} style={{ whiteSpace: 'nowrap' }}>{group.map(renderLetter)}</span>
          : <React.Fragment key={group.index}>{group.char}</React.Fragment>,
      )}
    </span>
  );
};
