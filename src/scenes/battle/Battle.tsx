import * as Phaser from 'phaser';

import * as React from 'react';
import ReactOverlay from '../../plugins/ReactOverlay';
import { BattleView } from './BattleView';
import { BattleStore, PileType } from './battleStore';

import { toJS } from 'mobx';
import { TargetType } from '../../model/card';
import { Combatant } from '../../model/combatant';
import { PlayerCombatant } from '../../model/playerCombatant';
import { CardInstance, cardDef } from '../../data/cards';
import { createEnemyCombatant, EnemyId } from '../../data/enemies';
import { TECHNIQUES } from '../../data/techinques';
import GameSession from '../../plugins/GameSession';
import { PlayerState } from '../../state/gameState';

/** Placeholder until battles are started with an encounter. */
const TEST_ENCOUNTER: EnemyId[] = ['hexaghost'];

const sceneConfig: Phaser.Types.Scenes.SettingsConfig = {
  active: false,
  visible: false,
  key: 'Battle',
};

export class Battle extends Phaser.Scene {
  reactOverlay: ReactOverlay;
  session: GameSession;
  store: BattleStore;

  /** Set once the battle is won or lost, so the result is only applied once. */
  private isOver = false;

  choiceSelectSound: Phaser.Sound.BaseSound;
  choiceDisabledSound: Phaser.Sound.BaseSound;

  constructor() {
    super(sceneConfig);
  }

  init(data: {  }): void {
    const { state } = this.session;
    TEST_ENCOUNTER.forEach((enemyId) => state.recordEnemySeen(enemyId));

    this.store = new BattleStore(
      createPlayerCombatant(state.player),
      TEST_ENCOUNTER.map(createEnemyCombatant),
    );
    this.isOver = false;

    this.choiceSelectSound = this.sound.add('choice-select');
    this.choiceDisabledSound = this.sound.add('stamina-depleted');
  }

  create(): void {
    shuffle(this.store.playerCombatant.deck);
    this.drawCards(5);
    this.reactOverlay.create(<BattleView battle={this}/>, this);
  }

  update(time: number, delta: number): void {

  }

  drawCards(amount: number): void {
    for (let i = 0; i < amount; i++) {
        if (this.store.playerCombatant.deck.length === 0) {
            if (this.store.playerCombatant.discard.length === 0) return;

            this.store.playerCombatant.deck = shuffle(this.store.playerCombatant.discard);
            this.store.playerCombatant.discard = [];
        }

        const card = this.store.playerCombatant.deck.pop();

        if (!card) continue;
        this.store.playerCombatant.hand.push(card);
    }
  };

  checkBattleEnd(): void {
    if (this.isOver) return;

    const lost = this.store.playerCombatant.health <= 0;
    const won = this.store.enemyCombatants.every(enemyCombatant => enemyCombatant.health <= 0);
    if (!lost && !won) return;

    this.isOver = true;

    // Placeholder rule until there's a design for losing: only a win carries
    // the battle's results back into the game. A loss leaves the player as
    // they were before the fight.
    if (won) {
      this.session.state.setPlayerHealth(this.store.playerCombatant.health);
      this.session.save();
    }

    this.scene.start('GameOver');
  }
  
  // #region handle events
  selectPile(pile: PileType) {
    this.choiceSelectSound.play();
    this.store.setSelectedPile(pile);
  }

  selectCardIndex(cardIndex: number) {
    this.choiceSelectSound.play();
    this.store.setSelectedCardIndex(cardIndex);
  }

  selectTarget(target: Combatant) {
    if (this.store.selectedPile !== PileType.hand) {
      this.choiceDisabledSound.play();
      return;
    }
    const { selectedCard } = this.store;
    if (!selectedCard) return;

    const isEnemy = 'name' in target;
    switch(cardDef(selectedCard).targetType) {
      case TargetType.SINGLE:
      case TargetType.AOE:
      case TargetType.RANDOM:
        if (!isEnemy || target.health === 0) {
          this.choiceDisabledSound.play();
          return;
        }
        this.choiceSelectSound.play();

      case TargetType.SINGLE:
        this.store.setTargets([target]);
        break;
      case TargetType.AOE:
        this.store.setTargets(this.store.enemyCombatants);
        break;
      case TargetType.RANDOM: // might have to refactor this for multi hit 
        this.store.setTargets([randomItem(this.store.enemyCombatants)]);
        break;
      case TargetType.SELF:
        if (isEnemy) {
          this.choiceDisabledSound.play();
          return;
        }
        this.choiceSelectSound.play();
        this.store.setTargets([target]);
      default:
        break;
    }

    this.tryExecutingSelectedCard();
  }

  tryExecutingSelectedCard(): void {
    const { selectedCard } = this.store;
    if (!selectedCard || !this.store.targets) return;
    const { cost } = cardDef(selectedCard);
    if (cost > this.store.playerCombatant.energy) {
      this.choiceDisabledSound.play();
      return;
    }

    this.store.playerCombatant.energy -= cost;

    this.executeCard(selectedCard);

    this.store.removeSelectedCardFromHand()
    this.store.resetSelections();
  }

  executeCard(card: CardInstance): void {
    cardDef(card).effects.forEach(effect => {
      effect.execute(this.store.playerCombatant, this.store.targets);
      this.sound.play(effect.sfxKey);
    });

    this.store.appendCardToDiscard(card);

    this.checkBattleEnd();
  }

  endTurn(): void {
    this.store.discardHand();
    
    for (let enemyCombatant of this.store.enemyCombatants.filter(enemy => enemy.health > 0)) {
      enemyCombatant.block = 0;

      const state = enemyCombatant.states[enemyCombatant.stateIndex];
      state.effects.forEach(effect => {
        effect.execute(enemyCombatant, [this.store.playerCombatant]);
        this.sound.play(effect.sfxKey);
      });
      enemyCombatant.stateIndex = state.getNextStateIndex(this, enemyCombatant);
    }
    this.store.playerCombatant.block = 0;
    this.checkBattleEnd();

    this.store.advanceTurnNumber();
    this.drawCards(5);
    this.store.playerCombatant.energy = this.store.playerCombatant.maxEnergy;
  }
  // #endregion
}



const shuffle = <T,>(array: T[]): T[] => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
};

const randomItem = <T,>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

export const clamp = (min: number, val: number, max: number): number => {
  return Math.min(Math.max(val, min), max);
};

/**
 * The player as they enter a battle: a copy of the saved player, so the battle
 * can change health, piles and energy freely until it writes results back.
 */
const createPlayerCombatant = (player: PlayerState): PlayerCombatant => ({
  health: player.health,
  maxHealth: player.maxHealth,
  block: 0,
  energy: player.maxEnergy,
  maxEnergy: player.maxEnergy,
  deck: [...player.deck],
  hand: [],
  discard: [],
  exhaust: [],
  activeTechniques: player.techniques.map(({ techniqueId, amount }) => ({
    technique: TECHNIQUES[techniqueId],
    amount,
  })),
});
