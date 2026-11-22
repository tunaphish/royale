import * as React from 'react';
import { motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';

import styles from '../story/story.module.css';
import { Dialogue } from './Dialogue';
import { StageView, StoryBox } from '../story/StoryViews';

/** One story on the stage and in the message box, fading out when it ends. */
export const DialogueView = observer(({ dialogue }: { dialogue: Dialogue }): JSX.Element => {
  const isLeaving = dialogue.leaving.get();

  const onAnimationComplete = (definition: { opacity: number }) => {
    if (definition.opacity === 0 && isLeaving) dialogue.leave();
  };

  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0 }}
      animate={{ opacity: isLeaving ? 0 : 1 }}
      transition={{ duration: 1 }}
      onAnimationComplete={onAnimationComplete}
    >
      <StageView player={dialogue.player} />
      <div className={styles.menu}>
        <StoryBox player={dialogue.player} />
      </div>
    </motion.div>
  );
});
