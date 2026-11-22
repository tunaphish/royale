import * as Phaser from 'phaser';
import type { CandidatePool } from './lights';
import { BLOB_KEY, BLOB_SIZE } from './textures';
import type { StampPool } from './patterns';

/** Light map values are stored divided by this, so overlapping lights can add up past 1. */
export const MAP_GAIN = 2;

/**
 * A low-res texture of all the soft light in the scene: one texel per art
 * pixel, read with nearest sampling, so map light snaps to the pixel grid for
 * free. Every frame it's cleared and each map light is stamped in as a blob,
 * additively. Lit materials read it at each art pixel.
 */
export class LightMap {
  readonly key: string;
  readonly texture: Phaser.Textures.DynamicTexture;
  private readonly scale: number;
  /** Area covered, in game pixels, from (0, 0). */
  readonly width: number;
  readonly height: number;

  /** `pixelSize` is the size of one art pixel on screen. */
  constructor(scene: Phaser.Scene, width: number, height: number, pixelSize: number) {
    this.key = `fx-lightmap/${scene.sys.settings.key}`;
    this.scale = 1 / pixelSize;
    this.width = width;
    this.height = height;
    if (scene.textures.exists(this.key)) scene.textures.remove(this.key);
    this.texture = scene.textures.addDynamicTexture(
      this.key,
      Math.ceil(width * this.scale),
      Math.ceil(height * this.scale),
    )!;
    this.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }

  /** Stamp settings for patterns, reused so drawing allocates nothing. */
  private readonly patternStamp = {
    originX: 0, originY: 0, scaleX: 1, scaleY: 1, tint: 0xffffff, alpha: 1, blendMode: Phaser.BlendModes.ADD,
  };

  /** Redraws the map from every candidate without a point slot, and every pattern copy. */
  draw(pool: CandidatePool, stamps: StampPool): void {
    const { texture, scale } = this;
    // Opaque black, not transparent: Phaser's ADD is (ONE, DST_ALPHA), so on a
    // transparent target each stamp would dim what's under it instead of adding.
    texture.fill(0x000000, 1);
    let stamped = 0;
    for (let i = 0; i < pool.count; i++) {
      const c = pool.items[i];
      if (c.inSlot || c.intensity <= 0) continue;
      const tint = (Math.round(c.r * 255) << 16) | (Math.round(c.g * 255) << 8) | Math.round(c.b * 255);
      texture.stamp(BLOB_KEY, undefined, c.x * scale, c.y * scale, {
        scale: (c.radius * 2 * scale) / BLOB_SIZE,
        tint,
        alpha: Math.min(c.intensity / MAP_GAIN, 1),
        blendMode: Phaser.BlendModes.ADD,
      });
      stamped++;
    }
    const config = this.patternStamp;
    for (let i = 0; i < stamps.count; i++) {
      const stamp = stamps.items[i];
      if (stamp.intensity <= 0) continue;
      const source = texture.manager.get(stamp.key).getSourceImage();
      config.scaleX = (stamp.width * scale) / source.width;
      config.scaleY = (stamp.height * scale) / source.height;
      config.tint = stamp.tint;
      config.alpha = Math.min(stamp.intensity / MAP_GAIN, 1);
      texture.stamp(stamp.key, undefined, stamp.x * scale, stamp.y * scale, config);
    }
    // A cleared map still needs rendering, or last frame's light stays.
    texture.render();
    this.lastCount = stamped;
  }

  /** Lights drawn last frame, for the lab's stats. */
  lastCount = 0;

  destroy(): void {
    this.texture.destroy();
  }
}
