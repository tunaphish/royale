import { makeAutoObservable, toJS } from 'mobx';
import type { CardInstance } from '../data/cards';
import type { EnemyId } from '../data/enemies';
import type { TechniqueId } from '../data/techinques';
import { clamp } from '../model/math';

export type OwnedTechnique = { techniqueId: TechniqueId; amount: number };

/** The player between battles. Battles copy this at the start and write results back at the end. */
export type PlayerState = {
  health: number;
  maxHealth: number;
  maxEnergy: number;
  deck: CardInstance[];
  techniques: OwnedTechnique[];
};

export type SeenEnemy = { enemyId: EnemyId; seenAt: number };

/**
 * Everything that outlives a scene, as plain data (IDs and numbers only),
 * so it can go straight into a save file.
 */
export type GameStateData = {
  player: PlayerState;
  spirits: number;
  seenEnemies: SeenEnemy[];
  /** Shared with ink through stat(), flag(), relationship() and friends. */
  stats: Record<string, number>;
  flags: Record<string, boolean>;
  relationships: Record<string, number>;
};

/** The live, observable game state for the current save slot. */
export class GameState {
  player: PlayerState;
  spirits: number;
  seenEnemies: SeenEnemy[];
  stats: Record<string, number>;
  flags: Record<string, boolean>;
  relationships: Record<string, number>;

  constructor(data: GameStateData) {
    this.player = data.player;
    this.spirits = data.spirits;
    this.seenEnemies = data.seenEnemies;
    this.stats = data.stats;
    this.flags = data.flags;
    this.relationships = data.relationships;
    makeAutoObservable(this);
  }

  /** A plain copy for saving. */
  toData(): GameStateData {
    return toJS({
      player: this.player,
      spirits: this.spirits,
      seenEnemies: this.seenEnemies,
      stats: this.stats,
      flags: this.flags,
      relationships: this.relationships,
    });
  }

  /** Stats nobody has set yet count as 0. */
  stat(name: string): number {
    return this.stats[name] ?? 0;
  }

  flag(name: string): boolean {
    return this.flags[name] ?? false;
  }

  setFlag(name: string, value: boolean): void {
    this.flags[name] = value;
  }

  relationship(character: string): number {
    return this.relationships[character] ?? 0;
  }

  addRelationship(character: string, amount: number): void {
    this.relationships[character] = this.relationship(character) + amount;
  }

  setPlayerHealth(health: number): void {
    this.player.health = clamp(0, health, this.player.maxHealth);
  }

  recordEnemySeen(enemyId: EnemyId): void {
    if (this.seenEnemies.some((seen) => seen.enemyId === enemyId)) return;
    this.seenEnemies.push({ enemyId, seenAt: Date.now() });
  }
}
