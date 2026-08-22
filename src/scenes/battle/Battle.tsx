
import * as React from 'react';
import ReactOverlay from '../../plugins/ReactOverlay';
import { BattleView } from './BattleView';
import { BattleStore } from './battleStore';

import { toJS } from 'mobx';
import { samplePlayerCombatant } from '../../data/sample-player';
import { PlayerCombatant } from '../../model/playerCombatant';
import { Card } from '../../model/card';

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
    this.store = new BattleStore(samplePlayerCombatant);

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
  selectPile(pile: Pile) {
    this.choiceSelectSound.play();
  }

  selectCard(card: Card) {
    this.choiceSelectSound.play();
    this.store.setSelectedCard(card);
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


