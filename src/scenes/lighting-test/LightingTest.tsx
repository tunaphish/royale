import * as Phaser from 'phaser';
import * as React from 'react';
import { autorun } from 'mobx';
import ReactOverlay from '../../plugins/ReactOverlay';
import { LightingTestStore } from './lightingTestStore';
import { LightingTestView } from './LightingTestView';

const SPRITE_KEY = 'characters/rena-sprite';
const NORMAL_KEY = 'characters/rena-sprite_n';

const sceneConfig: Phaser.Types.Scenes.SettingsConfig = {
  active: false,
  visible: false,
  key: 'LightingTest',
};

const hex = (color: string): number => parseInt(color.slice(1), 16);

/**
 * Dev test for Phaser's Light2D pipeline on 2D art: a point light follows the
 * pointer over Rena's sprite, shaded with her normal map. A panel tweaks colors,
 * brightness, reach, height and self-shadows. Open with `?scene=LightingTest`.
 */
export class LightingTest extends Phaser.Scene {
  reactOverlay: ReactOverlay;
  store: LightingTestStore;

  constructor() {
    super(sceneConfig);
  }

  init(): void {
    this.store = new LightingTestStore();
  }

  create(): void {
    const { width, height } = this.scale;

    // Boot loads every image on its own, so attach the normal map to the sprite's texture here.
    const normal = this.textures.get(NORMAL_KEY).getSourceImage() as HTMLImageElement;
    this.textures.get(SPRITE_KEY).setDataSource(normal);

    const sprite = this.add.image(width / 2, height / 2, SPRITE_KEY);
    sprite.setScale(Math.min(width / sprite.width, height / sprite.height));

    this.lights.enable();
    const key = this.lights.addLight(width / 2, height / 3);
    // Fixed behind her right shoulder.
    const rim = this.lights.addLight(width * 0.85, height * 0.2);

    const moveKey = (pointer: Phaser.Input.Pointer) => {
      if (this.store.settings.followPointer) key.setPosition(pointer.x, pointer.y);
    };
    this.input.on('pointermove', moveKey);
    this.input.on('pointerdown', moveKey);

    const stopSync = autorun(() => {
      const s = this.store.settings;
      sprite.setLighting(s.lit);
      sprite.setSelfShadow(s.selfShadow, s.penumbra);
      this.lights.setAmbientColor(hex(s.ambient));
      // An "off" light keeps its settings but gives no light.
      key.setColor(hex(s.key.color)).setIntensity(s.key.on ? s.key.intensity : 0).setRadius(s.key.radius).setZNormal(s.key.height);
      rim.setColor(hex(s.rim.color)).setIntensity(s.rim.on ? s.rim.intensity : 0).setRadius(s.rim.radius).setZNormal(s.rim.height);
    });
    this.events.once('shutdown', stopSync);

    this.reactOverlay.create(<LightingTestView scene={this} />, this);
  }
}
