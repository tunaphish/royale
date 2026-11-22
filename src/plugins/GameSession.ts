import { Plugins } from 'phaser';
import { newGameState } from '../data/new-game';
import { GameState } from '../state/gameState';
import { localStorageStorage, SaveManager } from '../state/saves';

/** The slot used until there's a slot picker. */
export const DEFAULT_SLOT = 'slot-1';

/**
 * Dev builds: runs started with `?scene=` (testing a story or scene) load and
 * save this slot instead, so testing never overwrites the real save. Progress
 * still carries over between test runs; add `?newgame` to reset it.
 */
export const DEV_TEST_SLOT = 'dev-test';

/**
 * Global plugin that owns the current game: which save slot is active and
 * its GameState. Mapped onto every scene as `this.session`.
 *
 * Add `?newgame` to the URL to start a fresh game instead of loading the save.
 * In dev builds, `?scene=` runs use their own slot (`DEV_TEST_SLOT`).
 *
 * Saves at checkpoints (a won battle, the end of a story, leaving a story)
 * and whenever the page is hidden, since phones can close a hidden page
 * without warning.
 */
export default class GameSession extends Plugins.BasePlugin {
  readonly saves = new SaveManager(localStorageStorage);
  slotId = DEFAULT_SLOT;
  state: GameState;

  constructor(pluginManager: Plugins.PluginManager) {
    super(pluginManager);
  }

  init(): void {
    const params = new URLSearchParams(window.location.search);
    const devTest = import.meta.env.DEV && params.has('scene');
    const slot = devTest ? DEV_TEST_SLOT : DEFAULT_SLOT;
    if (params.has('newgame') || !this.loadSlot(slot)) {
      this.newGame(slot);
    }
    if (devTest) console.info(`[GameSession] dev test run: using save slot "${slot}", not your real save`);

    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  destroy(): void {
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    super.destroy();
  }

  private onVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') {
      this.save();
    }
  };

  /** Starts a fresh game in a slot. Nothing is written until the next save. */
  newGame(slotId: string): void {
    this.slotId = slotId;
    this.state = new GameState(newGameState());
  }

  /** Loads a slot. Returns false if the slot is empty or unreadable. */
  loadSlot(slotId: string): boolean {
    const data = this.saves.load(slotId);
    if (!data) return false;

    this.slotId = slotId;
    this.state = new GameState(data);
    return true;
  }

  save(): void {
    this.saves.save(this.slotId, this.state.toData());
  }
}
