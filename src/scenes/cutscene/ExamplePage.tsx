import React from 'react'; 
import { Section, DialogueBubble, Panel } from './CutsceneComponents';
import { Frenzy } from '../ui/Frenzy';
import classNames from './cutscene.module.css';
 
export const ExamplePage = (): JSX.Element => {
  return (
    <div>
      <Section>
 
        <Panel
          src="/royale/cutscenes/ch1/1.png"
          position={{ x: '20%', y: '10%' }}
        />

        <DialogueBubble position={{ x: '50%', y: '30%' }}>
          hey this is <span className={classNames.limitBreak}>limit</span> break and <Frenzy>madness</Frenzy>...
        </DialogueBubble>
        
        
        <DialogueBubble position={{ x: '50%', y: '40%' }}>
          normal <span style={{ color: 'red' }}>red</span> class test..
        </DialogueBubble> 
       

 
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
 