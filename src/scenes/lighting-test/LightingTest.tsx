import * as Phaser from 'phaser';
import * as React from 'react';
import { autorun } from 'mobx';
import ReactOverlay from '../../plugins/ReactOverlay';
import { LightingTestStore } from './lightingTestStore';
import { LightingTestView } from './LightingTestView';
import { LIGHT_COUNT, PIXEL_LIGHT_FRAG } from './pixelLight';

const SPRITE_KEY = 'characters/rena-sprite';
const NORMAL_KEY = 'characters/rena-sprite_n';

const sceneConfig: Phaser.Types.Scenes.SettingsConfig = {
  active: false,
  visible: false,
  key: 'LightingTest',
};

const hex = (color: string): number => parseInt(color.slice(1), 16);

const rgb = (color: string): number[] => {
  const value = hex(color);
  return [(value >> 16) / 255, ((value >> 8) & 0xff) / 255, (value & 0xff) / 255];
};

/**
 * Dev test for lighting 2D art: a point light follows the pointer over Rena's
 * sprite, shaded with her normal map. Two modes: Phaser's Light2D (smooth, with
 * self-shadows) and a custom shader that snaps light to the art's pixel grid
 * and splits it into hard bands. A panel tweaks both. Open with `?scene=LightingTest`.
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

    // Boot loads every image on its own, so Light2D's normal map is attached to the
    // sprite's texture in the autorun below. The pixel shader samples it directly.
    const normal = this.textures.get(NORMAL_KEY).getSourceImage() as HTMLImageElement;
    const spriteTexture = this.textures.get(SPRITE_KEY);

    const sprite = this.add.image(width / 2, height / 2, SPRITE_KEY);
    const scale = Math.min(width / sprite.width, height / sprite.height);
    sprite.setScale(scale);

    this.lights.enable();
    const key = this.lights.addLight(width / 2, height / 3);
    // Fixed behind her right shoulder.
    const rim = this.lights.addLight(width * 0.85, height * 0.2);
    const lights = [key, rim];

    const pixelLit = this.createPixelLit(sprite, scale, lights);

    const moveKey = (pointer: Phaser.Input.Pointer) => {
      if (this.store.settings.followPointer) key.setPosition(pointer.x, pointer.y);
    };
    this.input.on('pointermove', moveKey);
    this.input.on('pointerdown', moveKey);

    const stopSync = autorun(() => {
      const s = this.store.settings;
      const pixelMode = this.store.mode === 'pixel';
      pixelLit.setVisible(pixelMode && s.lit);
      sprite.setVisible(!pixelLit.visible);
      sprite.setLighting(s.lit && !pixelMode);
      // Without a normal map, Light2D falls back to a flat one.
      if (this.store.normalMap) spriteTexture.setDataSource(normal);
      else spriteTexture.dataSource.length = 0;
      sprite.setSelfShadow(s.selfShadow, s.penumbra);
      this.lights.setAmbientColor(hex(s.ambient));
      // An "off" light keeps its settings but gives no light.
      key.setColor(hex(s.key.color)).setIntensity(s.key.on ? s.key.intensity : 0).setRadius(s.key.radius).setZNormal(s.key.height);
      rim.setColor(hex(s.rim.color)).setIntensity(s.rim.on ? s.rim.intensity : 0).setRadius(s.rim.radius).setZNormal(s.rim.height);
    });
    this.events.once('shutdown', stopSync);

    this.reactOverlay.create(<LightingTestView scene={this} />, this);
  }

  /** A quad over the sprite that draws it with the pixel lighting shader, reading `lights` every frame. */
  private createPixelLit(sprite: Phaser.GameObjects.Image, scale: number, lights: Phaser.GameObjects.Light[]) {
    const texWidth = sprite.width;
    const texHeight = sprite.height;
    const left = sprite.x - sprite.displayWidth / 2;
    const top = sprite.y - sprite.displayHeight / 2;

    // Light positions in texture pixels with y up, as the shader expects.
    const positions = new Array(LIGHT_COUNT * 3).fill(0);
    const colors = new Array(LIGHT_COUNT * 3).fill(0);
    const radii = new Array(LIGHT_COUNT).fill(0);
    const intensities = new Array(LIGHT_COUNT).fill(0);

    return this.add.shader(
      {
        name: 'PixelLight',
        fragmentSource: PIXEL_LIGHT_FRAG,
        initialUniforms: { uDiffuse: 0, uNormal: 1, uTexSize: [texWidth, texHeight] },
        setupUniforms: (setUniform: (name: string, value: unknown) => void) => {
          const { settings, grid } = this.store;
          lights.forEach((light, i) => {
            positions[i * 3] = (light.x - left) / scale;
            positions[i * 3 + 1] = texHeight - (light.y - top) / scale;
            positions[i * 3 + 2] = light.z / scale;
            colors[i * 3] = light.color.r;
            colors[i * 3 + 1] = light.color.g;
            colors[i * 3 + 2] = light.color.b;
            radii[i] = light.radius / scale;
            intensities[i] = light.intensity;
          });
          setUniform('uLightPos[0]', positions);
          setUniform('uLightColor[0]', colors);
          setUniform('uLightRadius[0]', radii);
          setUniform('uLightIntensity[0]', intensities);
          setUniform('uAmbient', rgb(settings.ambient));
          setUniform('uUseNormalMap', this.store.normalMap ? 1 : 0);
          setUniform('uPixelSize', Math.max(grid.size, 1));
          setUniform('uGridOffset', [grid.offsetX, grid.offsetY]);
          setUniform('uBands', settings.bands);
          setUniform('uBandSoftness', settings.bandSoftness);
        },
      },
      sprite.x,
      sprite.y,
      sprite.displayWidth,
      sprite.displayHeight,
      [SPRITE_KEY, NORMAL_KEY],
    );
  }
}
