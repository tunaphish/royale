import * as Phaser from 'phaser';
import Scenes from './scenes';
import ReactOverlay from './plugins/ReactOverlay';
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
    global: [{ key: 'react-overlay', plugin: ReactOverlay, start: true, mapping: 'reactOverlay' }],
  },
};

const seedLocalStorage = () => {
  localStorage.setItem(
    "royale:playersave",
    JSON.stringify({
      //example:  spirits: 120,
    })
  );
};
seedLocalStorage();

const game = new Phaser.Game(gameConfig);

export default game;

window.addEventListener('resize', () => {
  game.scale.refresh();
});