
import * as React from 'react';
import ReactOverlay from '../../plugins/ReactOverlay';
import { BattleView } from './BattleView';
import { BattleStore, PileType } from './battleStore';

import { toJS } from 'mobx';
import { samplePlayerCombatant } from '../../data/sample-player';
import { PlayerCombatant } from '../../model/playerCombatant';
import { Card, TargetType } from '../../model/card';
import { SAMPLE_ENEMY } from '../../data/enemies';
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
    const TEST_ENEMY_COMBATANTS = [SAMPLE_ENEMY];
    this.store = new BattleStore(samplePlayerCombatant, TEST_ENEMY_COMBATANTS);

    this.choiceSelectSound = this.sound.add('choice-select');
    this.choiceDisabledSound = this.sound.add('stamina-depleted');
  }

  create(): void {
    shuffle(this.store.playerCombatant.deck);
    drawCards(this.store.playerCombatant, 5);
    
    this.reactOverlay.create(<BattleView battle={this}/>, this);
  }

  update(time: number, delta: number): void {

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
        if (!isEnemy) {
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

    this.executeCard();
  }

  executeCard(): void {
    const selectedCard = this.store.playerCombatant.hand[this.store.selectedCardIndex];
    if (!selectedCard || !this.store.targets) return;
    
    this.store.playerCombatant.energy = Math.max(this.store.playerCombatant.energy-selectedCard.cost, 0);

    selectedCard.effects.forEach(effect => {
      effect.execute(this.store.playerCombatant, this.store.targets);
      this.sound.play(effect.sfxKey);
    })

    this.store.appendCardToDiscard(selectedCard)
    this.store.removeSelectedCardFromHand()
  
    this.store.resetSelections();
  }

  endTurn() {
    this.store.advanceTurnNumber();
  }
  // #endregion
}

const drawCards = (playerCombatant: PlayerCombatant, amount: number): void => {
    for (let i = 0; i < amount; i++) {
        if (playerCombatant.deck.length === 0) {
            if (playerCombatant.discard.length === 0) return;

            playerCombatant.deck = shuffle(playerCombatant.discard);
            playerCombatant.discard = [];
        }

        const card = playerCombatant.deck.pop();

        if (!card) continue;
        playerCombatant.hand.push(card);
    }
};

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