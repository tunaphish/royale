import * as React from 'react';
import { motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';

import styles from './dialogue.module.css';
import { Dialogue } from './Dialogue';
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

/**
 * The stage's box. Phaser draws the background, character and foreground
 * (`Dialogue.stage`) inside it; this view reports where the box is, forwards
 * the pointer for parallax, and shows `#display` text on top.
 */
export const StageView = observer((props: { dialogue: Dialogue }): JSX.Element => {
  const { dialogue } = props;
  const { display, typing } = dialogue.store;
  const stageRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    const report = () => dialogue.stage.setRectFromElement(element);
    report();
    // the box moves when the layout or the window changes size
    const observer = new ResizeObserver(report);
    observer.observe(element);
    window.addEventListener('resize', report);

    // pointer events cover both mouse and touch drags
    const onPointerMove = (e: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      dialogue.stage.setParallax(((e.clientX - rect.left) / rect.width) * 2 - 1, ((e.clientY - rect.top) / rect.height) * 2 - 1);
    };
    element.addEventListener('pointermove', onPointerMove);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', report);
      element.removeEventListener('pointermove', onPointerMove);
    };
  }, [dialogue]);

  return (
    <div ref={stageRef} className={styles.stage}>
      {display && (
        <div className={styles.displayText}>
          <RichText nodes={display.nodes} revealed={typing?.target === 'display' ? typing.revealed : undefined} />
        </div>
      )}
    </div>
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
