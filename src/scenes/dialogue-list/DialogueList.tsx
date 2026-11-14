import * as React from 'react';
import { motion } from 'framer-motion';
import { load } from 'js-yaml';
import styles from './dialoguelist.module.css';
import ReactOverlay from '../../plugins/ReactOverlay';

const sceneConfig: Phaser.Types.Scenes.SettingsConfig = {
  active: false,
  visible: false,
  key: 'DialogueList',
};

type ScriptSelection = { scriptFileKey: string; scriptKey: string };
type ScriptFile = { scriptFileKey: string; scriptKeys: string[] };

/**
 * List of Dialogue Scenes in the Game
 */
export class DialogueList extends Phaser.Scene {
  private reactOverlay: ReactOverlay;
  private choiceSelectSound: Phaser.Sound.BaseSound;
  private choiceHoverSound: Phaser.Sound.BaseSound;

  constructor() {
    super(sceneConfig);
  }

  public create(): void {
    this.choiceSelectSound = this.sound.add('choice-select');
    this.choiceHoverSound = this.sound.add('choice-hover');

    const scriptFiles: ScriptFile[] = this.cache.text.getKeys().map((scriptFileKey) => {
      const parsedData = load(this.cache.text.get(scriptFileKey)) as Record<string, string[]>;
      return { scriptFileKey, scriptKeys: Object.keys(parsedData ?? {}) };
    });

    const Ui = () => {
      const [selection, setSelection] = React.useState<ScriptSelection | null>(null);

      const onAnimationComplete = (definition: { opacity: number }) => {
        if (definition.opacity === 0 && selection) {
          this.scene.start('Dialogue', selection);
        }
      };

      const onClickScript = (scriptSelection: ScriptSelection) => {
        if (selection) return;
        this.choiceSelectSound.play();
        setSelection(scriptSelection);
      };

      const onHoverScript = () => {
        this.choiceHoverSound.play();
      };

      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: selection ? 0 : 1 }}
          transition={{ duration: 1 }}
          onAnimationComplete={onAnimationComplete}
        >
          {scriptFiles.map(({ scriptFileKey, scriptKeys }) => (
            <section key={scriptFileKey}>
              <h1 className={styles.title}>{scriptFileKey}</h1>
              {scriptKeys.map((scriptKey) => (
                <div
                  key={scriptKey}
                  className={styles.scriptButton}
                  onClick={() => onClickScript({ scriptFileKey, scriptKey })}
                  onMouseEnter={onHoverScript}
                >
                  - {scriptKey}
                </div>
              ))}
            </section>
          ))}
        </motion.div>
      );
    };

    this.reactOverlay.create(<Ui />, this);
  }
}
