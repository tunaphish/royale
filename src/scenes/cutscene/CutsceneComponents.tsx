import React, { ReactNode } from 'react';
import classNames from './cutscene.module.css';
import { TextToken } from '../ui/TypewriterText';
import { TypewriterText } from '../ui/TypewriterText';

interface BackgroundProps {
  backgroundSrc?: string;
  children?: ReactNode;
}

export const Section = ({ backgroundSrc: src, children }: BackgroundProps): JSX.Element => {
  return (
    <div
      className={classNames.background}
      style={{
        backgroundImage: src ? `url(${src})` : '',
      }}
    >
      {children}
    </div>
  );
}


interface PlacedProps {
  position?: { x: string; y: string };
  delay?: number;
  scrollTrigger?: boolean;
}
 
const placedStyle = (position: PlacedProps['position'] = { x: '50%', y: '50%' }) => ({
  position: 'absolute' as const,
  left: position.x,
  top: position.y,
});

interface TextToken {
  text: string;
  effect?: 'limit' | 'frenzy' | string;
}
 
interface DialogueBubbleProps extends PlacedProps {
  line: string | TextToken[];
}
 
export const DialogueBubble = ({
  line,
  position,

}: DialogueBubbleProps): JSX.Element => {
  const Content = typeof line === "string" ?
    line :
    <TypewriterText line={line} />
 
  return (
    <div className={classNames.dialogueBubble} style={placedStyle(position)}>
      {Content}
    </div>
  );
};

interface PanelProps extends PlacedProps {
  src?: string;
}
 
export const Panel = ({
  src,
  position,
}: PanelProps): JSX.Element => {
  return (
    <div style={placedStyle(position)} className={classNames.panel}> 
      <img src={src} />
    </div>
  );
};
 
