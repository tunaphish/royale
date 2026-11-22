import * as Phaser from 'phaser';
import * as React from 'react';
import { motion } from 'framer-motion';

import styles from './boot.module.css';
import ReactOverlay from '../../plugins/ReactOverlay';
import { compileStories } from '../../assets/ink';
import { checkFxData } from '../../fx/validate';
import { checkSchoolData } from '../../model/schoolValidate';
import { SCHOOL } from '../../data/school';
import { IMAGES, INK_INCLUDES, INK_STORIES, MUSIC, SFX, STORY_KEYS } from '../../assets/manifest';
import { checkStory, type TagProblem } from '../../model/storyTags';
import { TAG_ASSETS } from '../dialogue/tagAssets';

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

/**
 * Dev builds only: every tag in every story, checked at once (unknown tags,
 * missing images and sounds, bad arguments), so mistakes in untested branches
 * show up before anyone plays them.
 */
const checkStoryTags = (): TagProblem[] =>
  import.meta.env.DEV
    ? Object.entries(INK_STORIES).flatMap(([key, source]) => checkStory(key, source, TAG_ASSETS))
    : [];

/** Lists the stories' tag problems over the loading screen, until the player taps to go on. */
const TagProblems = ({ problems, onContinue }: { problems: TagProblem[]; onContinue: () => void }) => (
  <div className={styles.problems}>
    <div className={styles.problemsTitle}>
      {problems.length} problem{problems.length === 1 ? '' : 's'} in story tags
    </div>
    <ul className={styles.problemList}>
      {problems.map(({ story, line, problem }, i) => (
        <li key={i}>
          <span className={styles.problemWhere}>{story}.ink:{line}</span> {problem}
        </li>
      ))}
    </ul>
    <div className={styles.problemsHint}>Tags with problems do nothing when the story plays. Also in the console.</div>
    <button className={styles.continueButton} onClick={onContinue}>continue anyway</button>
  </div>
);

export class Boot extends Phaser.Scene {
  reactOverlay: ReactOverlay
  /** Set in `create`: problems with story tags (dev builds only). */
  private storyProblems: TagProblem[] = [];

  constructor() {
    super(sceneConfig);
  }

  public preload(): void {
    const Ui = () => {
      const [percent, setPercent] = React.useState<number>(0);
      const [fileKey, setFileKey] = React.useState<string>('');
      const [opacity, setOpacity]  = React.useState<number>(1);
      const [problems, setProblems] = React.useState<TagProblem[]>([]);
      const start = () => {
        const { scene, data } = readStartTarget(Object.keys(this.game.scene.keys));
        this.scene.start(scene, data);
      };

      React.useEffect(() => {    
        this.load.on('progress', (value: number) => (setPercent(Math.trunc(value * 100))));
        this.load.on('fileprogress', (file: Phaser.Loader.File) => (setFileKey(file.key)));
        this.load.on('complete', () => setOpacity(0));
      });

      return (
          <motion.div 
            animate={{opacity}} 
            transition={{ duration: .2 }} 
            className={styles.loadingContainer} 
            onAnimationComplete={(definition: { opacity: number }) => {  
              if (definition.opacity !== 0) return;
              // wait on the player if the stories have tag problems
              if (this.storyProblems.length > 0) {
                setProblems(this.storyProblems);
                setOpacity(1);
              } else {
                start();
              }
            }}
          >
            {problems.length > 0 && <TagProblems problems={problems} onContinue={start} />}
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

  /** Queues every sound, song and image from the asset manifest. */
  private loadAssets(): void {
    Object.entries(SFX).forEach(([key, url]) => this.load.audio(key, url));
    Object.entries(MUSIC).forEach(([key, url]) => this.load.audio(key, url));
    Object.entries(IMAGES).forEach(([key, url]) => this.load.image(key, url));
  }

  public create(): void {
    const compiled = compileStories(INK_STORIES, INK_INCLUDES);
    Object.entries(compiled).forEach(([key, json]) => this.cache.json.add(key, json));
    // Bad FX or lighting data fails here, not halfway through a story.
    checkFxData(this.textures);
    // Same for the school sim's data: students, stars, events and the stories they play.
    const schoolProblems = checkSchoolData(SCHOOL, STORY_KEYS);
    if (schoolProblems.length > 0) {
      throw new Error(`[Boot] school data has ${schoolProblems.length} problem(s):\n${schoolProblems.join('\n')}`);
    }
    this.storyProblems = checkStoryTags();
    if (this.storyProblems.length > 0) {
      console.warn(`[Boot] story tag problems:\n${this.storyProblems.map((p) => `${p.story}.ink:${p.line} ${p.problem}`).join('\n')}`);
    }
  }
}
