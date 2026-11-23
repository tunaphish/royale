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

/** Not a story key: going back to the main menu. */
const BACK = '<main menu>';

/**
 * List of ink stories in the game, and the way back to the main menu. Each one plays from the top.
 */
export class DialogueList extends Phaser.Scene {
  private reactOverlay: ReactOverlay;

  constructor() {
    super(sceneConfig);
  }

  public create(): void {
    const Ui = () => {
      /** A story's key, or BACK for the main menu. */
      const [selection, setSelection] = React.useState<string | null>(null);

      const onAnimationComplete = (definition: { opacity: number }) => {
        if (definition.opacity !== 0 || !selection) return;
        if (selection === BACK) this.scene.start('MainMenu');
        else this.scene.start('Dialogue', { storyKey: selection });
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
          className={styles.container}
          initial={{ opacity: 0 }}
          animate={{ opacity: selection ? 0 : 1 }}
          transition={{ duration: 1 }}
          onAnimationComplete={onAnimationComplete}
        >
          <h1 className={styles.title}>stories</h1>
          <div className={styles.list}>
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
          </div>
          <div className={`${styles.scriptButton} ${styles.back}`} onClick={() => onClickStory(BACK)} onMouseEnter={onHoverStory}>
            main menu
          </div>
        </motion.div>
      );
    };

    this.reactOverlay.create(<Ui />, this);
  }
}
