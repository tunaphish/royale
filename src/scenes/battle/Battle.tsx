
import * as React from 'react';
import ReactOverlay from '../../plugins/ReactOverlay';
import { BattleView } from './BattleView';
import { BattleStore, PileType } from './battleStore';

import { toJS } from 'mobx';
import { samplePlayerCombatant } from '../../data/sample-player';
import { Card, TargetType } from '../../model/card';
import { hexaghost } from '../../data/enemies';
import { Combatant } from '../../model/combatant';

const sceneConfig: Phaser.Types.Scenes.SettingsConfig = {
  active: false,
  visible: false,
  key: 'Battle',
};

export class Battle extends Phaser.Scene {
  reactOverlay: ReactOverlay;
  store: BattleStore;

  choiceSelectSound: Phaser.Sound.BaseSound;
  choiceDisabledSound: Phaser.Sound.BaseSound;

  constructor() {
    super(sceneConfig);
  }

  init(data: {  }): void {
    const TEST_ENEMY_COMBATANTS = [hexaghost];
    this.store = new BattleStore(samplePlayerCombatant, TEST_ENEMY_COMBATANTS);

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
    // lose
    if (this.store.playerCombatant.health <= 0) {
      this.scene.start('GameOver');
    }

    // win
    if (this.store.enemyCombatants.every(enemyCombatant => enemyCombatant.health <= 0)) {
      this.scene.start('GameOver');
    }
  }
  
  // #region handle events
  selectPile(pile: Card[]) {
    this.choiceSelectSound.play();
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
    const selectedCard = this.store.playerCombatant.hand[this.store.selectedCardIndex];
    if (!selectedCard) return;

    const isEnemy = 'name' in target;
    switch(selectedCard.targetType) {
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
    const selectedCard = this.store.playerCombatant.hand[this.store.selectedCardIndex];
    if (!selectedCard || !this.store.targets) return;
    if (selectedCard.cost > this.store.playerCombatant.energy) {
      this.choiceDisabledSound.play();
      return;
    }

    this.store.playerCombatant.energy -= selectedCard.cost;

    this.executeCard(selectedCard);

    this.store.removeSelectedCardFromHand()
    this.store.resetSelections();
  }

  executeCard(card: Card): void {
    card.effects.forEach(effect => {
      effect.execute(this, this.store.targets);
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
        effect.execute(this, [enemyCombatant]);
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