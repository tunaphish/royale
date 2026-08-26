import React from 'react'; 
import { Section, DialogueBubble, Panel } from './CutsceneComponents';
 
export const ExamplePage = (): JSX.Element => {
  return (
    <div style={{ width: '100%' }}>
      <Section>
 
        <Panel
          src="/royale/cutscenes/ch1/1.png"
          position={{ x: '20%', y: '10%' }}
        />

        <DialogueBubble
          line={[
            { text: 'hey this is ' },
            { text: 'limit', effect: 'limit' },
            { text: ' break and ' },
            { text: 'madness', effect: 'frenzy' },
            { text: '...' },
          ]}
          position={{ x: '50%', y: '30%' }}
        />
 
        <DialogueBubble
          line="I wasn't expecting visitors."
          position={{ x: '50%', y: '55%' }}
        />
 
        <DialogueBubble
          line="What brings you here?"
          position={{ x: '50%', y: '120%' }}
        />
      </Section>
 
      <div style={{ height: '8000px' }} />
    </div>
  );
};
 