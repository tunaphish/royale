import { Plugins } from 'phaser';
import { newGameState } from '../data/new-game';
import { GameState } from '../state/gameState';
import { localStorageStorage, SaveManager } from '../state/saves';

/** The slot used until there's a slot picker. */
export const DEFAULT_SLOT = 'slot-1';

/**
 * Global plugin that owns the current game: which save slot is active and
 * its GameState. Mapped onto every scene as `this.session`.
 *
 * Add `?newgame` to the URL to start a fresh game instead of loading the save.
 */
export default class GameSession extends Plugins.BasePlugin {
  readonly saves = new SaveManager(localStorageStorage);
  slotId = DEFAULT_SLOT;
  state: GameState;

  constructor(pluginManager: Plugins.PluginManager) {
    super(pluginManager);
  }

  init(): void {
    const wantsNewGame = new URLSearchParams(window.location.search).has('newgame');
    if (wantsNewGame || !this.loadSlot(DEFAULT_SLOT)) {
      this.newGame(DEFAULT_SLOT);
    }
  }

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
