import React from 'react'; 
import { Section, DialogueBubble, Panel } from './CutsceneComponents';
import { Frenzy, Limit } from '../ui/Characters';
 
export const ExamplePage = (): JSX.Element => {
  return (
    <div>
      <Section>
 
        <Panel
          src="/royale/cutscenes/ch1/1.png"
          position={{ x: '20%', y: '10%' }}
        />

        <DialogueBubble position={{ x: '50%', y: '30%' }}>
          hey this is <Limit>limit</Limit> break and <Frenzy>madness</Frenzy>...
        </DialogueBubble>
        
        {/* 
        <DialogueBubble position={{ x: '50%', y: '40%' }}>
          normal <div style={{ color: 'red' }}>red</div> class test..
        </DialogueBubble> 
        */}

 
        <DialogueBubble position={{ x: '50%', y: '55%' }}>
          I wasn't expecting visitors.
        </DialogueBubble>
 
        <DialogueBubble position={{ x: '50%', y: '120%' }}>
          What brings you here?
        </DialogueBubble>
      </Section>
 
      <div style={{ height: '8000px' }} />
    </div>
  );
};
 