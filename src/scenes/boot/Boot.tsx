import * as React from 'react';
import { motion } from 'framer-motion';

import styles from './boot.module.css';
import ReactOverlay from '../../plugins/ReactOverlay';
import { compileInkScripts } from './inkScripts';
import { loadAll } from '../../assets/manifest';

type StartTarget = { scene: string; data: Record<string, string> };

/** Where the game goes once loading finishes. */
const DEFAULT_START: StartTarget = { scene: 'Dialogue', data: { storyKey: 'final-battle' } };

/** URL params that aren't scene data. */
const RESERVED_PARAMS = ['scene', 'newgame'];

/**
 * Dev builds only: `?scene=Battle` jumps straight to a scene after loading.
 * Other params become the scene's data, e.g. `?scene=Dialogue&storyKey=final-battle`.
 * Without data, the default scene still gets its default data.
 * Production builds always use DEFAULT_START.
 */
const readStartTarget = (sceneKeys: string[]): StartTarget => {
  if (!import.meta.env.DEV) return DEFAULT_START;

  const params = new URLSearchParams(window.location.search);
  const scene = params.get('scene');
  if (!scene) return DEFAULT_START;

  if (!sceneKeys.includes(scene)) {
    console.warn(`[Boot] ?scene=${scene} isn't a scene. Scenes: ${sceneKeys.join(', ')}`);
    return DEFAULT_START;
  }

  RESERVED_PARAMS.forEach((param) => params.delete(param));
  const data = Object.fromEntries(params);
  const defaults = scene === DEFAULT_START.scene ? DEFAULT_START.data : {};
  return { scene, data: { ...defaults, ...data } };
};

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
              if (definition.opacity === 0) {
                const { scene, data } = readStartTarget(Object.keys(this.game.scene.keys));
                this.scene.start(scene, data);
              }
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

    loadAll(this.load);
  }

  public create(): void {
    compileInkScripts(this.cache);
  }
}
