import { makeAutoObservable, toJS } from 'mobx';
import type { CardInstance } from '../data/cards';
import type { EnemyId } from '../data/enemies';
import type { TechniqueId } from '../data/techinques';
import { clamp } from '../model/math';
import { clampDisposition } from '../model/disposition';

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

/** A short-lived feeling (`embarrassed`, `grateful`), active while the calendar's time is before `until`. */
export type Mood = { mood: string; until: number };

/** How one student stands with the player. Students nobody has touched yet aren't stored. */
export type StudentState = {
  /** -10 (hostile) to 10 (close); see `model/disposition.ts`. */
  disposition: number;
  moods: Mood[];
};

/** Something that happened between the player and a student in a royale (`humiliated`, `spared`). */
export type HistoryEntry = { time: number; student: string; event: string };

export type CalendarState = {
  /** Slots since the game began: 0 is the first Saturday morning. */
  time: number;
  /** Slots taken away by events or injuries, as times. */
  lostSlots: number[];
  /** Fixed for the whole game, so random schedules come out the same after a reload. */
  seed: number;
};

/**
 * Everything that outlives a scene, as plain data (IDs and numbers only),
 * so it can go straight into a save file.
 */
export type GameStateData = {
  player: PlayerState;
  gold: number;
  /** The player's standing in the school; changes with each royale. */
  elo: number;
  seenEnemies: SeenEnemy[];
  /** Shared with ink through stat(), flag(), disposition() and friends. */
  stats: Record<string, number>;
  flags: Record<string, boolean>;
  students: Record<string, StudentState>;
  calendar: CalendarState;
  /** IDs of the constellation's lit stars. */
  stars: string[];
  history: HistoryEntry[];
  /** IDs of what the player has learned about the next royale. */
  intel: string[];
  /** Items the player carries (gifts), by ID, with how many. */
  inventory: Record<string, number>;
};

/** The live, observable game state for the current save slot. */
export class GameState {
  player: PlayerState;
  gold: number;
  elo: number;
  seenEnemies: SeenEnemy[];
  stats: Record<string, number>;
  flags: Record<string, boolean>;
  students: Record<string, StudentState>;
  calendar: CalendarState;
  stars: string[];
  history: HistoryEntry[];
  intel: string[];
  inventory: Record<string, number>;

  constructor(data: GameStateData) {
    this.player = data.player;
    this.gold = data.gold;
    this.elo = data.elo;
    this.seenEnemies = data.seenEnemies;
    this.stats = data.stats;
    this.flags = data.flags;
    this.students = data.students;
    this.calendar = data.calendar;
    this.stars = data.stars;
    this.history = data.history;
    this.intel = data.intel;
    this.inventory = data.inventory;
    makeAutoObservable(this);
  }

  /** A plain copy for saving. */
  toData(): GameStateData {
    return toJS({
      player: this.player,
      gold: this.gold,
      elo: this.elo,
      seenEnemies: this.seenEnemies,
      stats: this.stats,
      flags: this.flags,
      students: this.students,
      calendar: this.calendar,
      stars: this.stars,
      history: this.history,
      intel: this.intel,
      inventory: this.inventory,
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

  addStat(name: string, amount: number): void {
    this.stats[name] = this.stat(name) + amount;
  }

  addGold(amount: number): void {
    this.gold = Math.max(0, this.gold + amount);
  }

  /** Students nobody has touched yet are neutral (0). */
  disposition(student: string): number {
    return this.students[student]?.disposition ?? 0;
  }

  addDisposition(student: string, amount: number): void {
    const state = this.studentState(student);
    state.disposition = clampDisposition(state.disposition + amount);
  }

  hasMood(student: string, mood: string): boolean {
    const now = this.calendar.time;
    return this.students[student]?.moods.some((m) => m.mood === mood && m.until > now) ?? false;
  }

  /** Gives a student a mood for this many slots, replacing the same mood. 0 or less removes it. */
  setMood(student: string, mood: string, slots: number): void {
    const state = this.studentState(student);
    const now = this.calendar.time;
    state.moods = state.moods.filter((m) => m.mood !== mood && m.until > now);
    if (slots > 0) state.moods.push({ mood, until: now + slots });
  }

  hasStar(star: string): boolean {
    return this.stars.includes(star);
  }

  lightStar(star: string): void {
    if (!this.hasStar(star)) this.stars.push(star);
  }

  hasHistory(student: string, event: string): boolean {
    return this.history.some((entry) => entry.student === student && entry.event === event);
  }

  addHistory(student: string, event: string): void {
    this.history.push({ time: this.calendar.time, student, event });
  }

  knowsIntel(intel: string): boolean {
    return this.intel.includes(intel);
  }

  learnIntel(intel: string): void {
    if (!this.knowsIntel(intel)) this.intel.push(intel);
  }

  /** Intel is about the next royale, so it's forgotten once that royale is over. */
  clearIntel(): void {
    this.intel = [];
  }

  addElo(amount: number): void {
    this.elo += amount;
  }

  items(item: string): number {
    return this.inventory[item] ?? 0;
  }

  /** Adds items, or takes them away with a negative amount (never below 0). */
  addItem(item: string, amount: number): void {
    const count = Math.max(0, this.items(item) + amount);
    if (count === 0) delete this.inventory[item];
    else this.inventory[item] = count;
  }

  setTime(time: number): void {
    this.calendar.time = time;
  }

  loseSlots(times: number[]): void {
    for (const time of times) {
      if (!this.calendar.lostSlots.includes(time)) this.calendar.lostSlots.push(time);
    }
  }

  setPlayerHealth(health: number): void {
    this.player.health = clamp(0, health, this.player.maxHealth);
  }

  recordEnemySeen(enemyId: EnemyId): void {
    if (this.seenEnemies.some((seen) => seen.enemyId === enemyId)) return;
    this.seenEnemies.push({ enemyId, seenAt: Date.now() });
  }

  /** The student's stored state, created neutral on first change. */
  private studentState(student: string): StudentState {
    this.students[student] ??= { disposition: 0, moods: [] };
    return this.students[student];
  }
}
