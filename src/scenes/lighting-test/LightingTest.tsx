import * as Phaser from 'phaser';
import * as React from 'react';
import { autorun } from 'mobx';
import ReactOverlay from '../../plugins/ReactOverlay';
import { LightingTestStore } from './lightingTestStore';
import { LightingTestView } from './LightingTestView';
import { LIGHT_COUNT, PIXEL_LIGHT_FRAG } from './pixelLight';
import { BACKLIGHT_FRAG } from './backlight';

const SPRITE_KEY = 'characters/rena-sprite';
const NORMAL_KEY = 'characters/rena-sprite_n';
const FOREGROUND_KEY = 'layers/sakura';
/** The foreground is drawn this much larger than the portrait so parallax never shows its edges. */
const FOREGROUND_OVERSCAN = 1.08;

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
  private foreground: Phaser.GameObjects.Shader;
  /** Where the foreground sits with no parallax. */
  private foregroundHome = new Phaser.Math.Vector2();

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
    this.foreground = this.createForeground(sprite, scale, lights);
    this.foregroundHome.set(this.foreground.x, this.foreground.y);
    this.foreground.enableFilters();
    const blur = this.foreground.filters!.internal.addBlur(1, 2, 2, 0);

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
    const stopForegroundSync = autorun(() => {
      const fg = this.store.foreground;
      this.foreground.setVisible(fg.on);
      blur.strength = fg.blur;
      blur.active = fg.blur > 0;
    });
    this.events.once('shutdown', () => {
      stopSync();
      stopForegroundSync();
    });

    this.reactOverlay.create(<LightingTestView scene={this} />, this);
  }

  update(): void {
    // Parallax: the foreground drifts against the pointer, easing toward its target.
    const { parallax } = this.store.foreground;
    const pointer = this.input.activePointer;
    const { width, height } = this.scale;
    const targetX = this.foregroundHome.x - ((pointer.x - width / 2) / (width / 2)) * parallax;
    const targetY = this.foregroundHome.y - ((pointer.y - height / 2) / (height / 2)) * parallax;
    this.foreground.x += (targetX - this.foreground.x) * 0.1;
    this.foreground.y += (targetY - this.foreground.y) * 0.1;
  }

  /** The foreground layer, drawn with the backlight shader and lit by `lights` from behind. */
  private createForeground(sprite: Phaser.GameObjects.Image, portraitScale: number, lights: Phaser.GameObjects.Light[]) {
    const source = this.textures.get(FOREGROUND_KEY).getSourceImage();
    const texWidth = source.width;
    const texHeight = source.height;
    const displayWidth = sprite.displayWidth * FOREGROUND_OVERSCAN;
    const displayHeight = sprite.displayHeight * FOREGROUND_OVERSCAN;
    const scale = displayWidth / texWidth;

    const positions = new Array(LIGHT_COUNT * 3).fill(0);
    const colors = new Array(LIGHT_COUNT * 3).fill(0);
    const radii = new Array(LIGHT_COUNT).fill(0);
    const intensities = new Array(LIGHT_COUNT).fill(0);

    const shader = this.add.shader(
      {
        name: 'Backlight',
        fragmentSource: BACKLIGHT_FRAG,
        initialUniforms: { uTexture: 0, uTexSize: [texWidth, texHeight] },
        setupUniforms: (setUniform: (name: string, value: unknown) => void) => {
          const { settings, grid, foreground: fg } = this.store;
          // The layer moves with parallax, so light positions are relative to where it is now.
          const left = shader.x - displayWidth / 2;
          const top = shader.y - displayHeight / 2;
          lights.forEach((light, i) => {
            positions[i * 3] = (light.x - left) / scale;
            positions[i * 3 + 1] = texHeight - (light.y - top) / scale;
            positions[i * 3 + 2] = fg.depth / scale;
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
          // Same art-pixel size on screen as the portrait's grid.
          setUniform('uPixelSize', Math.max((grid.size * portraitScale) / scale, 1));
          setUniform('uBands', settings.bands);
          setUniform('uBandSoftness', settings.bandSoftness);
          setUniform('uFill', fg.fill);
          setUniform('uTranslucency', fg.translucency);
          setUniform('uRim', fg.rim);
          setUniform('uRimWidth', fg.rimWidth);
          setUniform('uOpacity', fg.opacity);
        },
      },
      sprite.x,
      sprite.y,
      displayWidth,
      displayHeight,
      [FOREGROUND_KEY],
    );
    return shader;
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
