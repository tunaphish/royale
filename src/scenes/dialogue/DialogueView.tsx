import * as React from 'react';
import { motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';

import styles from './dialogue.module.css';
import { Dialogue } from './Dialogue';
import { Portrait } from './dialogueStore';
import { ParallaxLayer, ParallaxProvider, useParallaxOffset } from './parallax';
import { imageUrl } from '../../assets/manifest';
import { RichText } from '../ui/RichText';

export const DialogueView = observer((props: { dialogue: Dialogue }): JSX.Element => {
  const { dialogue } = props;
  const { isLeaving } = dialogue.store;

  const onAnimationComplete = (definition: { opacity: number }) => {
    if (definition.opacity === 0 && isLeaving) {
      dialogue.leave();
    }
  };

  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0 }}
      animate={{ opacity: isLeaving ? 0 : 1 }}
      transition={{ duration: 1 }}
      onAnimationComplete={onAnimationComplete}
    >
      <StageView dialogue={dialogue} />
      <div className={styles.menu}>
        {dialogue.store.choices
          ? <ChoicesView dialogue={dialogue} />
          : <ActorMessageView dialogue={dialogue} />}
      </div>
    </motion.div>
  );
});

const backgroundSrc = (key: string) => imageUrl(`backgrounds/${key}`);
const portraitSrc = ({ character, emotion }: Portrait) => imageUrl(`characters/${character}${emotion ? `-${emotion}` : ''}`);
const foregroundSrc = (key: string) => key.startsWith('http') ? key : imageUrl(`foregrounds/${key}`);

export const StageView = observer((props: { dialogue: Dialogue }): JSX.Element => {
  const { dialogue } = props;
  const { background, portrait, foreground, display, typing } = dialogue.store;
  const stageRef = React.useRef<HTMLDivElement>(null);
  const offset = useParallaxOffset(stageRef);

  return (
    <ParallaxProvider value={offset}>
      <div ref={stageRef} className={styles.stage}>
        <div className={styles.backgroundLayer}>
          {background && <img className={styles.backgroundImage} src={backgroundSrc(background)} />}
        </div>

        <ParallaxLayer depth={20} className={styles.portraitLayer}>
          {portrait && (
            <motion.img
              key={portraitSrc(portrait)}
              className={styles.portraitImage}
              src={portraitSrc(portrait)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
          )}
        </ParallaxLayer>

        <ParallaxLayer depth={40} className={styles.foregroundLayer}>
          {foreground && <img className={styles.foregroundImage} src={foregroundSrc(foreground)} />}
        </ParallaxLayer>

        {display && (
          <div className={styles.displayText}>
            <RichText nodes={display.nodes} revealed={typing?.target === 'display' ? typing.revealed : undefined} />
          </div>
        )}
      </div>
    </ParallaxProvider>
  );
});

export const ActorMessageView = observer((props: { dialogue: Dialogue }): JSX.Element => {
  const { dialogue } = props;
  const { message, typing } = dialogue.store;
  const isTyping = typing?.target === 'message';

  return (
    <div className={styles.actorMessage} onClick={() => dialogue.advance()}>
      {message && (
        <div className={isTyping ? `${styles.actorDialogue} ${styles.typing}` : styles.actorDialogue}>
          <RichText nodes={message.nodes} revealed={isTyping ? typing.revealed : undefined} />
        </div>
      )}
    </div>
  );
});

export const ChoicesView = observer((props: { dialogue: Dialogue }): JSX.Element => {
  const { dialogue } = props;

  return (
    <div className={styles.dialogueOptions}>
      {dialogue.store.choices?.map((choice) => (
        <div
          key={choice.index}
          className={styles.optionDiv}
          onClick={() => dialogue.selectChoice(choice)}
        >
          <RichText nodes={choice.nodes} />
        </div>
      ))}
    </div>
  );
});
