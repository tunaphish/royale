
import * as React from 'react';
import ReactOverlay from '../../plugins/ReactOverlay';
import { BattleView } from './BattleView';
import { BattleStore } from './battleStore';

import { toJS } from 'mobx';

const sceneConfig: Phaser.Types.Scenes.SettingsConfig = {
  active: false,
  visible: false,
  key: 'Battle',
};

export class Battle extends Phaser.Scene {
  reactOverlay: ReactOverlay;

  constructor() {
    super(sceneConfig);
  }

  init(data: {  }): void {
    
  }

  create(): void {
    this.reactOverlay.create(<BattleView battle={this}/>, this);
  }

  update(time: number, delta: number): void {

  }
  
}
