import * as Phaser from 'phaser';
import Scenes from './scenes';
import ReactOverlay from './plugins/ReactOverlay';
import GameSession from './plugins/GameSession';
import { configure } from "mobx";

configure({
  enforceActions: "never"
});

const gameConfig: Phaser.Types.Core.GameConfig = {
  title: 'r o y a l e',
  type: Phaser.AUTO,
  width: 450,
  height: 800,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: Scenes,
  physics: {
    default: 'arcade',
    arcade: {
      debug: true,
    },
  },
  parent: 'game',
  backgroundColor: '#000000',
  dom: {
    createContainer: true,
  },
  plugins: {
    global: [
      { key: 'react-overlay', plugin: ReactOverlay, start: true, mapping: 'reactOverlay' },
      { key: 'game-session', plugin: GameSession, start: true, mapping: 'session' },
    ],
  },
};

const game = new Phaser.Game(gameConfig);

export default game;

window.addEventListener('resize', () => {
  game.scale.refresh();
});