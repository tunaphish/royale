import * as Phaser from 'phaser';
import type { FxSystem } from '../fx/FxSystem';
import type { LitMaterial } from '../fx/LitMaterial';
import { DEPTH } from '../fx/types';

/** The stage's area, in game pixels. */
export interface StageRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Most each layer moves with parallax, in game pixels. Nearer layers move more. */
const PARALLAX = { background: 0, portrait: 20, foreground: 40 } as const;
/** Parallax spring, matching the feel of the old framer-motion spring. */
const SPRING = { stiffness: 120, damping: 20 };
const PORTRAIT_FADE_MS = 300;

export interface Portrait {
  character: string;
  emotion?: string;
}

/** An image on the stage and the lit material drawing it. */
interface Layer {
  image: Phaser.GameObjects.Image;
  material: LitMaterial;
}

/**
 * The presentation layer for story scenes: background, the character on stage,
 * and a foreground, drawn in Phaser so `this.fx` can light them and FX can
 * play around them.
 *
 * The main camera is pointed at the stage's area, so the stage has its own
 * coordinates: (0, 0) is its top left, and everything outside is cut off.
 * The scene's React UI decides where the stage is and reports it with `setRect`.
 *
 * Layout matches what React used to draw:
 * - background: full width, bottom-aligned
 * - portrait: fits the stage, bottom-centered, never upscaled past its own size
 * - foreground: covers the stage
 * Portrait and foreground extend past the stage edges so parallax never shows a gap.
 */
export class Stage {
  private rect: StageRect = { x: 0, y: 0, width: 1, height: 1 };
  /** Game pixels per CSS pixel. Caps portrait size like an `<img>`'s natural size did. */
  private cssToGame = 1;
  private background?: Layer;
  private portrait?: Layer & { portrait: Portrait };
  private foreground?: Layer;
  private foregroundKey: string | null = null;
  private foregroundBacklit = false;

  /** Parallax: target and current offset (-1 to 1 on each axis), and the spring's velocity. */
  private target = new Phaser.Math.Vector2();
  private offset = new Phaser.Math.Vector2();
  private velocity = new Phaser.Math.Vector2();

  constructor(private scene: Phaser.Scene, private fx: FxSystem) {
    const camera = scene.cameras.main;
    camera.setBackgroundColor(0x000000);
    // Hidden until the UI reports where the stage is.
    camera.setVisible(false);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  get width(): number {
    return this.rect.width;
  }

  get height(): number {
    return this.rect.height;
  }

  /** Where the stage is on the canvas, in game pixels. */
  setRect(rect: StageRect, cssToGame: number): void {
    this.rect = rect;
    this.cssToGame = cssToGame;
    const camera = this.scene.cameras.main;
    camera.setViewport(Math.round(rect.x), Math.round(rect.y), Math.round(rect.width), Math.round(rect.height));
    camera.setVisible(true);
    this.layout();
  }

  /**
   * Converts a DOM element's box to game pixels and makes it the stage.
   * For React views: call it with the stage element whenever it may have moved.
   */
  setRectFromElement(element: HTMLElement): void {
    const canvas = this.scene.game.canvas.getBoundingClientRect();
    const box = element.getBoundingClientRect();
    if (canvas.width === 0 || box.width === 0) return;
    const scale = this.scene.scale.width / canvas.width;
    this.setRect(
      {
        x: (box.left - canvas.left) * scale,
        y: (box.top - canvas.top) * scale,
        width: box.width * scale,
        height: box.height * scale,
      },
      scale,
    );
  }

  /** Parallax target, -1 to 1 on each axis (where the player is pointing, relative to the stage). */
  setParallax(x: number, y: number): void {
    this.target.set(Phaser.Math.Clamp(x, -1, 1), Phaser.Math.Clamp(y, -1, 1));
  }

  setBackground(key: string | null): void {
    this.removeLayer(this.background);
    this.background = undefined;
    if (!key) return;
    const texture = `backgrounds/${key}`;
    if (!this.exists(texture, `#bg ${key}`)) return;
    this.background = this.addLayer(texture, DEPTH.background);
    this.layout();
  }

  setPortrait(portrait: Portrait | null): void {
    this.removeLayer(this.portrait);
    this.portrait = undefined;
    if (!portrait) return;
    const { character, emotion } = portrait;
    const texture = `characters/${character}${emotion ? `-${emotion}` : ''}`;
    if (!this.exists(texture, `#enter ${character}${emotion ? ` ${emotion}` : ''}`)) return;
    const layer = this.addLayer(texture, DEPTH.characters);
    this.portrait = { ...layer, portrait };
    layer.image.setAlpha(0);
    this.scene.tweens.add({ targets: layer.image, alpha: 1, duration: PORTRAIT_FADE_MS });
    this.layout();
  }

  /**
   * `key` is a file in `images/foregrounds/`, any image key (`layers/sakura`), or a URL.
   * `backlit` draws it lit from behind, for leaves and curtains between the viewer and the light.
   */
  setForeground(key: string | null, options: { backlit?: boolean } = {}): void {
    this.removeLayer(this.foreground);
    this.foreground = undefined;
    this.foregroundKey = key;
    this.foregroundBacklit = options.backlit ?? false;
    if (!key) return;

    if (/^https?:\/\//.test(key)) {
      this.loadUrl(key, () => this.foregroundKey === key && this.showForeground(key));
      return;
    }
    const texture = this.scene.textures.exists(`foregrounds/${key}`) ? `foregrounds/${key}` : key;
    if (!this.exists(texture, `#foreground ${key}`)) return;
    this.showForeground(texture);
  }

  /** The character on stage, if it's `character`. For FX that follow them. */
  characterImage(character: string): Phaser.GameObjects.Image | undefined {
    return this.portrait?.portrait.character === character ? this.portrait.image : undefined;
  }

  private showForeground(texture: string): void {
    this.foreground = this.addLayer(texture, DEPTH.foreground, this.foregroundBacklit ? 'backlit' : 'front');
    this.layout();
  }

  private loadUrl(url: string, onLoad: () => void): void {
    if (this.scene.textures.exists(url)) {
      onLoad();
      return;
    }
    const { load } = this.scene;
    // WebGL can't use images from other sites without CORS.
    load.setCORS('anonymous');
    load.image(url, url);
    load.once(`filecomplete-image-${url}`, onLoad);
    load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      if (file.key === url) console.warn(`[Stage] couldn't load foreground ${url}`);
    });
    load.start();
  }

  private exists(texture: string, from: string): boolean {
    if (this.scene.textures.exists(texture)) return true;
    console.warn(`[Stage] ${from}: no image "${texture}" in src/assets/images`);
    return false;
  }

  private addLayer(texture: string, depth: number, material: 'front' | 'backlit' = 'front'): Layer {
    const image = this.scene.add.image(0, 0, texture).setDepth(depth);
    return { image, material: this.fx.lit(image, { material }) };
  }

  private removeLayer(layer: Layer | undefined): void {
    if (!layer) return;
    this.scene.tweens.killTweensOf(layer.image);
    this.fx.unlit(layer.material);
    layer.image.destroy();
  }

  /** Sizes every layer for the current stage. Positions come from `update`. */
  private layout(): void {
    const { width, height } = this.rect;
    if (this.background) {
      const { image } = this.background;
      image.setOrigin(0.5, 1).setScale(width / image.width);
    }
    if (this.portrait) {
      const { image } = this.portrait;
      const pad = PARALLAX.portrait * 2;
      const fit = Math.min((width + pad) / image.width, (height + pad) / image.height, this.cssToGame);
      image.setOrigin(0.5, 1).setScale(fit);
    }
    if (this.foreground) {
      const { image } = this.foreground;
      const pad = PARALLAX.foreground * 2;
      const cover = Math.max((width + pad) / image.width, (height + pad) / image.height);
      image.setOrigin(0.5, 0.5).setScale(cover);
    }
    this.place();
  }

  private place(): void {
    const { width, height } = this.rect;
    const { x, y } = this.offset;
    this.background?.image.setPosition(width / 2, height);
    this.portrait?.image.setPosition(width / 2 - x * PARALLAX.portrait, height + PARALLAX.portrait - y * PARALLAX.portrait);
    this.foreground?.image.setPosition(width / 2 - x * PARALLAX.foreground, height / 2 - y * PARALLAX.foreground);
  }

  private update(_time: number, delta: number): void {
    // A damped spring toward the target, stepped in small slices so a slow frame can't overshoot.
    let remaining = Math.min(delta, 100) / 1000;
    while (remaining > 0) {
      const dt = Math.min(remaining, 1 / 120);
      remaining -= dt;
      this.velocity.x += (SPRING.stiffness * (this.target.x - this.offset.x) - SPRING.damping * this.velocity.x) * dt;
      this.velocity.y += (SPRING.stiffness * (this.target.y - this.offset.y) - SPRING.damping * this.velocity.y) * dt;
      this.offset.x += this.velocity.x * dt;
      this.offset.y += this.velocity.y * dt;
    }
    this.place();
  }

  private destroy(): void {
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
  }
}
