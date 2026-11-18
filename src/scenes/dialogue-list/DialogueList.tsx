import * as Phaser from 'phaser';
import * as React from 'react';
import { motion } from 'framer-motion';
import styles from './dialoguelist.module.css';
import ReactOverlay from '../../plugins/ReactOverlay';
import { STORY_KEYS } from '../../assets/manifest';

const sceneConfig: Phaser.Types.Scenes.SettingsConfig = {
  active: false,
  visible: false,
  key: 'DialogueList',
};

/**
 * List of ink stories in the game. Each one plays from the top.
 */
export class DialogueList extends Phaser.Scene {
  private reactOverlay: ReactOverlay;

  constructor() {
    super(sceneConfig);
  }

  public create(): void {
    const Ui = () => {
      const [selection, setSelection] = React.useState<string | null>(null);

      const onAnimationComplete = (definition: { opacity: number }) => {
        if (definition.opacity === 0 && selection) {
          this.scene.start('Dialogue', { storyKey: selection });
        }
      };

      const onClickStory = (storyKey: string) => {
        if (selection) return;
        this.sound.play('choice-select');
        setSelection(storyKey);
      };

      const onHoverStory = () => {
        this.sound.play('choice-hover');
      };

      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: selection ? 0 : 1 }}
          transition={{ duration: 1 }}
          onAnimationComplete={onAnimationComplete}
        >
          <h1 className={styles.title}>stories</h1>
          {STORY_KEYS.map((storyKey) => (
            <div
              key={storyKey}
              className={styles.scriptButton}
              onClick={() => onClickStory(storyKey)}
              onMouseEnter={onHoverStory}
            >
              - {storyKey}
            </div>
          ))}
        </motion.div>
      );
    };

    this.reactOverlay.create(<Ui />, this);
  }
}
