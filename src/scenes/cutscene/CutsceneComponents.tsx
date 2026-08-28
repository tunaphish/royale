import React, { ReactNode } from 'react';
import classNames from './cutscene.module.css';
import { TextSpeed } from '../ui/TypewriterText';
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

interface DialogueBubbleProps extends PlacedProps {
  children: React.ReactNode;
  textSpeed?: TextSpeed | number;
  onTextComplete?: () => void;
}
 
export const DialogueBubble = ({
  children,
  position,
  textSpeed,
  onTextComplete,
}: DialogueBubbleProps): JSX.Element => {
  return (
    <div className={classNames.dialogueBubble} style={placedStyle(position)}>
      <TypewriterText textSpeed={textSpeed} onComplete={onTextComplete}>
        {children}
      </TypewriterText>
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
 
