import React, { ReactNode } from 'react';
import classNames from './cutscene.module.css';
import { TextToken } from '../../model/encounter';
import { TypewriterText } from '../ui/TypewriterText';

interface BackgroundProps {
  src: string;
  children?: ReactNode;
}

export const Section = ({ src, children }: BackgroundProps): JSX.Element => {
  return (
    <div
      className={classNames.background}
      style={{
        backgroundImage: `url(${src})`,
      }}
    >
      {children}
    </div>
  );
}

interface DialogueBubbleProps {
  line: string | TextToken[];
  position?: { x: string; y: string };
  speaker?: string;
}

export const DialogueBubble = ({
  line,
  position = { x: '50%', y: '50%' },
}: DialogueBubbleProps): JSX.Element => {
  const Content = typeof line === "string" ?
    line :
    <TypewriterText line={line} />

  return (
    <div
      className={classNames.dialogueBubble}
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      { Content }
    </div>
  );
}