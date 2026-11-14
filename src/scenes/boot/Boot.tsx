import * as React from 'react';
import { motion } from 'framer-motion';

import styles from './boot.module.css';
import ReactOverlay from '../../plugins/ReactOverlay';
import { LocalStorageAdapter } from '../../external/LocalStorageAdapter';

const SCENE_TO_START = 'Dialogue';

const sceneConfig: Phaser.Types.Scenes.SettingsConfig = {
  active: false,
  visible: false,
  key: 'Boot',
};

export class Boot extends Phaser.Scene {
  reactOverlay: ReactOverlay

  constructor() {
    super(sceneConfig);
  }

  public preload(): void {
    const Ui = () => {
      const [percent, setPercent] = React.useState<number>(0);
      const [fileKey, setFileKey] = React.useState<string>('');
      const [opacity, setOpacity]  = React.useState<number>(1);

      React.useEffect(() => {    
        this.load.on('progress', (value: number) => (setPercent(Math.trunc(value * 100))));
        this.load.on('fileprogress', (file: any) => (setFileKey(file.key)));
        this.load.on('complete', () => setOpacity(0));
      });

      return (
          <motion.div 
            animate={{opacity}} 
            transition={{ duration: .2 }} 
            className={styles.loadingContainer} 
            onAnimationComplete={(definition: { opacity: number }) => {  
              if (definition.opacity === 0) this.scene.start(SCENE_TO_START);
            }}
          >
            <div className={styles.spinner}>
              <div className={styles.cube1}></div>
              <div className={styles.cube2}></div>
            </div>
            <div className={styles.loadingText}>{percent}%</div>
            <div className={styles.loadingText}>Loading: {fileKey}</div>
        </motion.div>
      );
    }
    this.reactOverlay.create(<Ui/>, this);

    this.loadAssets();
  }

  private loadAssets() {
    this.load.audio('battle-start', '/royale/sounds/battle-start.mp3');
    this.load.audio('action-ready', '/royale/sounds/action-ready.mp3');
    this.load.audio('choice-hover', '/royale/sounds/choice-hover.wav');
    this.load.audio('choice-select', '/royale/sounds/choice-select.wav');
    this.load.audio('window-advance', '/royale/sounds/window-advance.wav');
    this.load.audio('battle-start', '/royale/sounds/battle-start-2.mp3');
    this.load.audio('stamina-depleted', '/royale/sounds/stamina-depleted.wav');


    this.load.audio('heal', '/royale/sounds/heal.mp3');
    this.load.audio('block', '/royale/sounds/block.wav');
    this.load.audio('attack', '/royale/sounds/attack.wav');
    this.load.audio('debuff', '/royale/sounds/debuff.wav');
    this.load.audio('smirk', '/royale/sounds/smirk.mp3');
    this.load.audio('charged', '/royale/sounds/charged.mp3');
    this.load.audio('restriction-violated', '/royale/sounds/restriction-violated.mp3');
    this.load.audio('bomb', '/royale/sounds/bomb.wav');
    this.load.audio('slime-noise', '/royale/sounds/slime-noise.mp3');

    // related to new dialogue
    this.load.image('eji', '/royale/characters/eji.png');
    this.load.image('main-menu', '/royale/backgrounds/main-menu.png');
    this.load.text('final-battle', '/royale/scripts/final-battle.yaml');
    this.load.text('temp-scripts', '/royale/scripts/temp-scripts.yaml');
    this.load.audio('knight', '/royale/music/knight.mp3');
  }
}
