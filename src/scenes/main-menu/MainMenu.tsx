import * as Phaser from 'phaser';
import * as React from 'react';
import { motion } from 'framer-motion';
import { observable } from 'mobx';
import { observer } from 'mobx-react-lite';
import styles from './mainmenu.module.css';
import ReactOverlay from '../../plugins/ReactOverlay';
import GameSession from '../../plugins/GameSession';
import { imageUrl } from '../../assets/manifest';

const sceneConfig: Phaser.Types.Scenes.SettingsConfig = {
  active: false,
  visible: false,
  key: 'MainMenu',
};

const BACKGROUND = 'backgrounds/main-menu';
/** How long the menu takes to fade out before the next scene starts. */
const FADE_S = 0.5;

/** Where each menu item goes. */
type Destination = 'continue' | 'new-game' | 'stories' | 'fx-lab';

/**
 * The game's front door, where Boot goes once loading finishes: continue the
 * save, start a new game (both into the school week), the story list, or the
 * FX lab.
 */
export class MainMenu extends Phaser.Scene {
  reactOverlay: ReactOverlay;
  session: GameSession;
  /** Picked and fading out; `leave` runs once the fade ends. */
  readonly leaving = observable.box<Destination | null>(null);
  /** "New game" over a save needs a second tap. */
  readonly confirmingNewGame = observable.box(false);

  constructor() {
    super(sceneConfig);
  }

  init(): void {
    this.leaving.set(null);
    this.confirmingNewGame.set(false);
  }

  create(): void {
    this.reactOverlay.create(<MainMenuView menu={this} />, this);
  }

  /** The session's slot has a save to continue. */
  get hasSave(): boolean {
    return this.session.saves.listSlots().some((slot) => slot.id === this.session.slotId);
  }

  pick(destination: Destination): void {
    if (this.leaving.get()) return;
    if (destination === 'continue' && !this.hasSave) return;
    if (destination === 'new-game' && this.hasSave && !this.confirmingNewGame.get()) {
      this.sound.play('choice-hover');
      this.confirmingNewGame.set(true);
      return;
    }
    this.sound.play('choice-select');
    this.leaving.set(destination);
  }

  hover(): void {
    this.sound.play('choice-hover');
  }

  /** Runs once the menu has faded out. */
  leave(): void {
    const destination = this.leaving.get();
    const { session } = this;
    switch (destination) {
      case 'continue':
        // the save as last written: anything since (an unsaved new game) is dropped
        if (!session.loadSlot(session.slotId)) session.newGame(session.slotId);
        this.scene.start('School');
        return;
      case 'new-game':
        session.newGame(session.slotId);
        session.save();
        this.scene.start('School');
        return;
      case 'stories':
        this.scene.start('DialogueList');
        return;
      case 'fx-lab':
        this.scene.start('FxLab');
        return;
    }
  }
}

const MainMenuView = observer(({ menu }: { menu: MainMenu }) => {
  const leaving = menu.leaving.get();
  const hasSave = menu.hasSave;
  const background = imageUrl(BACKGROUND);
  const item = (destination: Destination, label: string, disabled = false) => (
    <button
      className={styles.item}
      disabled={disabled}
      onClick={() => menu.pick(destination)}
      onMouseEnter={() => !disabled && menu.hover()}
    >
      {label}
    </button>
  );

  return (
    <motion.div
      className={styles.container}
      style={background ? { backgroundImage: `url(${background})` } : undefined}
      initial={{ opacity: 0 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: FADE_S }}
      onAnimationComplete={(definition: { opacity: number }) => {
        if (definition.opacity === 0 && leaving) menu.leave();
      }}
    >
      <h1 className={styles.title}>royale</h1>
      <nav className={styles.items}>
        {item('continue', 'Continue', !hasSave)}
        {item('new-game', menu.confirmingNewGame.get() ? 'Replace your save? Tap again' : 'New game')}
        {item('stories', 'Stories')}
        {item('fx-lab', 'FX lab')}
      </nav>
    </motion.div>
  );
});
