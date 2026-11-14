import * as React from 'react';
import { motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';

import styles from './dialogue.module.css';
import { Dialogue } from './Dialogue';

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
      <ParallaxView dialogue={dialogue} />
      <div className={styles.menu}>
        {dialogue.store.choices
          ? <ChoicesView dialogue={dialogue} />
          : <ActorMessageView dialogue={dialogue} />}
      </div>
    </motion.div>
  );
});

export const ParallaxView = observer((props: { dialogue: Dialogue }): JSX.Element => {
  const { dialogue } = props;
  const { foreground, middleground, background, animeText } = dialogue.store;
  const parallaxRef = React.useRef<HTMLDivElement>(null);

  // set directly on the element so mouse movement doesn't re-render
  const onMouseMove = (e: React.MouseEvent) => {
    const w = window.innerWidth / 2;
    const h = window.innerHeight / 2;
    const depth = (factor: number) =>
      `${50 - (e.clientX - w) * factor}% ${50 - (e.clientY - h) * factor}%`;
    if (parallaxRef.current) {
      parallaxRef.current.style.backgroundPosition = `${depth(0.06)}, ${depth(0.03)}, ${depth(0.01)}`;
    }
  };

  return (
    <div
      ref={parallaxRef}
      className={styles.parallax}
      style={{ backgroundImage: `${foreground}, ${middleground}, ${background}` }}
      onMouseMove={onMouseMove}
    >
      {animeText && (
        <div className={styles.animeText}>
          {animeText.text}
        </div>
      )}
    </div>
  );
});

export const ActorMessageView = observer((props: { dialogue: Dialogue }): JSX.Element => {
  const { dialogue } = props;
  const { message } = dialogue.store;

  return (
    <div className={styles.actorMessage} onClick={() => dialogue.advance()}>
      {message && (
        <div className={styles.actorDialogue}>
          {message.text}
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
          key={choice.newScriptKey}
          className={styles.optionDiv}
          onClick={() => dialogue.selectChoice(choice)}
        >
          {choice.displayText}
        </div>
      ))}
    </div>
  );
});
