import React from 'react';
import classNames from './ui.module.css';
import { TextEffectType, getEffectType, renderChar } from './Characters';

export enum TextSpeed {
  SLOW = 45,
  NORMAL = 25,
  FAST = 5,
}

export type TypedChar = {
  char: string;
  effect: TextEffectType;
};
 
interface TypewriterTextProps {
  children: React.ReactNode;
  textSpeed?: TextSpeed | number;
  onComplete?: () => void;
  skipAnimation?: boolean;
}
 
export const TypewriterText = ({
  children,
  textSpeed = TextSpeed.NORMAL,
  onComplete,
  skipAnimation = false,
}: TypewriterTextProps): JSX.Element => {
 
  const chars = React.useMemo<TypedChar[]>(
    () => extractTypedCharsFromChildren(children),
    [children]
  );
  const [displayedIndex, setDisplayedIndex] = React.useState(0);
 
  React.useEffect(() => {
    if (skipAnimation) {
      setDisplayedIndex(chars.length);
      onComplete?.();
      return;
    }
 
    if (displayedIndex >= chars.length) {
      onComplete?.();
      return;
    }
 
    const delay = typeof textSpeed === 'number' ? textSpeed : textSpeed;
    const timeout = setTimeout(() => {
      setDisplayedIndex((i) => i + 1);
    }, delay);
 
    return () => clearTimeout(timeout);
  }, [displayedIndex, chars.length, textSpeed, skipAnimation, onComplete]);
 
  return (
    <div className={classNames.typewriterContainer}>
      {chars.slice(0, displayedIndex).map((typedChar, idx) =>
        renderChar(typedChar.char, typedChar.effect, idx)
      )}
    </div>
  );
};

export const extractTypedCharsFromChildren = (
  children: React.ReactNode
): TypedChar[] => {
  const chars: TypedChar[] = [];

  const processChild = (child: React.ReactNode, effect: TextEffectType = 'normal') => {
    if (typeof child === 'string' || typeof child === 'number') {
      const text = String(child);
      text.split('').forEach((char) => {
        chars.push({ char, effect });
      });
    } else if (Array.isArray(child)) {
      child.forEach((item) => processChild(item, effect));
    } else if (React.isValidElement(child)) {
      const childEffect = getEffectType(child.type) ?? effect;
      processChild(child.props.children, childEffect);
    }
  };

  processChild(children);
  return chars;
};