import React from 'react';
import classNames from './ui.module.css';

export enum TextSpeed {
  SLOW = 45,
  NORMAL = 25,
  FAST = 5,
}

export type TypedChar = {
  char: string;
  wrappers: React.ReactElement[];
};

interface TypewriterTextProps {
  children: React.ReactNode;
  textSpeed?: TextSpeed | number;
  onComplete?: () => void;
  skipAnimation?: boolean;
}

export const TypewriterText = ({
  children,
  textSpeed = TextSpeed.SLOW,
  onComplete,
  skipAnimation = false,
}: TypewriterTextProps): JSX.Element => {
  const chars = React.useMemo(
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

    const timeout = setTimeout(() => {
      setDisplayedIndex((index) => index + 1);
    }, textSpeed);

    return () => clearTimeout(timeout);
  }, [
    displayedIndex,
    chars.length,
    textSpeed,
    skipAnimation,
    onComplete,
  ]);

  return (
    <div className={classNames.typewriterContainer}>
      {chars.map((typedChar, index) =>
        renderTypedChar(
          typedChar,
          index,
          index < displayedIndex
        )
      )}
    </div>
  );
};

export const extractTypedCharsFromChildren = (
  children: React.ReactNode
): TypedChar[] => {
  const chars: TypedChar[] = [];

  const processChild = (
    child: React.ReactNode,
    wrappers: React.ReactElement[] = []
  ): void => {
    if (typeof child === 'string' || typeof child === 'number') {
      String(child)
        .split('')
        .forEach((char) => chars.push({ char, wrappers,}));

      return;
    }

    if (Array.isArray(child)) {
      child.forEach((item) => processChild(item, wrappers));
      return;
    }

    if (React.isValidElement(child)) {
      const wrapper = React.cloneElement(child, { children: undefined,});
      processChild(child.props.children, [...wrappers, wrapper]);
    }
  };

  processChild(children);

  return chars;
};

export const renderTypedChar = (
  typedChar: TypedChar,
  index: number,
  visible: boolean
): React.ReactNode => {
  let result: React.ReactNode = (
    <span style={{ visibility: visible ? 'visible' : 'hidden',}}>
      {typedChar.char === ' '
        ? '\u00A0'
        : typedChar.char}
    </span>
  );

  [...typedChar.wrappers]
    .reverse()
    .forEach((wrapper, wrapperIndex) => {
      result = React.cloneElement(wrapper, {
        key: `${index}-${wrapperIndex}`,
        children: result,
      });
    });

  return result;
};