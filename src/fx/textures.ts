import * as Phaser from 'phaser';
import { patternLight, patternTextureKey } from './patterns';

/**
 * Sprites made in code, so simple FX need no art. Use them as `'builtin:<name>'`.
 * They're white so particles can tint them any color.
 */
const BUILTINS = {
  cross: drawCross,
  square: drawSquare,
  orb: drawOrb,
  /** A small leaf, lying sideways with its stem on the left. Tint it any color. */
  leaf: drawLeaf,
  /** A long soft shaft of light, standing upright, fading at both ends. For god rays: tilt it with `angle`. */
  ray: drawRay,
  /** A thin raindrop streak, standing upright, brightest at the bottom. Tilt it with `angle` to match its fall. */
  drop: drawDrop,
  /** Smooth falloff used for the light map. Not pixel art: the light map is low-res anyway. */
  blob: drawBlob,
} as const;

export type BuiltinSprite = keyof typeof BUILTINS;

const PREFIX = 'builtin:';

export const isBuiltin = (sprite: string): boolean => sprite.startsWith(PREFIX);

/** The texture key for an FX sprite. */
export const spriteKey = (sprite: string): string =>
  isBuiltin(sprite) ? `fx-builtin/${sprite.slice(PREFIX.length)}` : sprite;

export const builtinNames = Object.keys(BUILTINS) as BuiltinSprite[];

export const BLOB_KEY = spriteKey('builtin:blob');
export const BLOB_SIZE = 64;

/** Creates the built-in textures once per game. Safe to call from every scene. */
export function ensureBuiltinTextures(textures: Phaser.Textures.TextureManager): void {
  for (const name of builtinNames) {
    const key = spriteKey(PREFIX + name);
    if (textures.exists(key)) continue;
    BUILTINS[name](textures, key);
  }
}

/** Pixel-art sprites are drawn on a grid of `PIXEL`-sized blocks. */
const PIXEL = 3;

function canvas(textures: Phaser.Textures.TextureManager, key: string, cells: number, nearest: boolean) {
  const texture = textures.createCanvas(key, cells * PIXEL, cells * PIXEL)!;
  if (nearest) texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  const ctx = texture.getContext();
  const cell = (cx: number, cy: number, alpha: number) => {
    if (alpha <= 0.01) return;
    ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
    ctx.fillRect(cx * PIXEL, cy * PIXEL, PIXEL, PIXEL);
  };
  return { texture, ctx, cell };
}

/** Soft blocky halo, so additive blending glows. */
function halo(cell: (x: number, y: number, a: number) => void, cells: number, strength: number) {
  const c = (cells - 1) / 2;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const d = Math.hypot(x - c, y - c) / c;
      cell(x, y, Math.max(0, 1 - d) ** 2 * strength);
    }
  }
}

function drawCross(textures: Phaser.Textures.TextureManager, key: string) {
  const { texture, cell } = canvas(textures, key, 15, true);
  halo(cell, 15, 0.35);
  for (let y = 6; y <= 8; y++) for (let x = 6; x <= 8; x++) cell(x, y, x === 7 || y === 7 ? 1 : 0.6);
  [0.85, 0.55, 0.3, 0.15].forEach((alpha, i) => {
    const d = i + 2;
    cell(7, 7 - d, alpha);
    cell(7, 7 + d, alpha);
    cell(7 - d, 7, alpha);
    cell(7 + d, 7, alpha);
  });
  texture.refresh();
}

function drawSquare(textures: Phaser.Textures.TextureManager, key: string) {
  const { texture, cell } = canvas(textures, key, 9, true);
  halo(cell, 9, 0.3);
  for (let y = 3; y <= 5; y++) for (let x = 3; x <= 5; x++) cell(x, y, 1);
  texture.refresh();
}

function drawOrb(textures: Phaser.Textures.TextureManager, key: string) {
  const { texture, cell } = canvas(textures, key, 21, true);
  const c = 10;
  for (let y = 0; y < 21; y++) {
    for (let x = 0; x < 21; x++) {
      const d = Math.hypot(x - c, y - c);
      // Solid core, then stepped rings fading out.
      const alpha = d <= 3 ? 1 : d <= 5 ? 0.6 : d <= 7.5 ? 0.3 : d <= 10 ? 0.12 : 0;
      cell(x, y, alpha);
    }
  }
  texture.refresh();
}

function drawLeaf(textures: Phaser.Textures.TextureManager, key: string) {
  const { texture, ctx } = canvas(textures, key, 10, true);
  // Rows 2 to 6 of a 10x10 grid, so it spins around its middle. The texture is
  // white for tinting, so shading is grey: lit top half, midrib, shaded bottom half.
  const rows = [
    '   ####   ',
    ' ######## ',
    '=---------',
    ' ,,,,,,,, ',
    '   ,,,,   ',
  ];
  const shade: Record<string, number> = { '#': 255, '-': 185, '=': 160, ',': 215 };
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (!(ch in shade)) return;
    const v = shade[ch];
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x * PIXEL, (y + 2) * PIXEL, PIXEL, PIXEL);
  }));
  texture.refresh();
}

function drawBlob(textures: Phaser.Textures.TextureManager, key: string) {
  const texture = textures.createCanvas(key, BLOB_SIZE, BLOB_SIZE)!;
  const ctx = texture.getContext();
  const image = ctx.createImageData(BLOB_SIZE, BLOB_SIZE);
  const c = (BLOB_SIZE - 1) / 2;
  for (let y = 0; y < BLOB_SIZE; y++) {
    for (let x = 0; x < BLOB_SIZE; x++) {
      const d = Math.hypot(x - c, y - c) / c;
      // Same falloff as a point light, so a light looks the same in a slot or in the map.
      const a = Math.max(0, 1 - d * d);
      const i = (y * BLOB_SIZE + x) * 4;
      // Phaser premultiplies canvas textures on upload, so color stays white here.
      image.data[i] = image.data[i + 1] = image.data[i + 2] = 255;
      image.data[i + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(image, 0, 0);
  texture.refresh();
}

const RAY_WIDTH = 56;
const RAY_LENGTH = 320;

function drawRay(textures: Phaser.Textures.TextureManager, key: string) {
  const texture = textures.createCanvas(key, RAY_WIDTH, RAY_LENGTH)!;
  const ctx = texture.getContext();
  const image = ctx.createImageData(RAY_WIDTH, RAY_LENGTH);
  const c = (RAY_WIDTH - 1) / 2;
  const smooth = (t: number) => t * t * (3 - 2 * t);
  for (let y = 0; y < RAY_LENGTH; y++) {
    const t = y / (RAY_LENGTH - 1);
    // Fades in over the top fifth and out over the bottom half: brightest near where it enters.
    const along = smooth(Math.min(t / 0.2, 1)) * smooth(Math.min((1 - t) / 0.5, 1));
    for (let x = 0; x < RAY_WIDTH; x++) {
      // Soft all the way across and never fully opaque, so crossing rays glow instead of blowing out.
      const across = 0.7 * Math.max(0, 1 - Math.abs(x - c) / c) ** 2;
      const i = (y * RAY_WIDTH + x) * 4;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = 255;
      image.data[i + 3] = Math.round(across * along * 255);
    }
  }
  ctx.putImageData(image, 0, 0);
  texture.refresh();
}

const DROP_WIDTH = 4;
const DROP_LENGTH = 40;

function drawDrop(textures: Phaser.Textures.TextureManager, key: string) {
  const texture = textures.createCanvas(key, DROP_WIDTH, DROP_LENGTH)!;
  const ctx = texture.getContext();
  const image = ctx.createImageData(DROP_WIDTH, DROP_LENGTH);
  for (let y = 0; y < DROP_LENGTH; y++) {
    // A faint tail up top, the drop itself at the bottom.
    const along = 0.2 + 0.8 * (y / (DROP_LENGTH - 1)) ** 0.8;
    for (let x = 0; x < DROP_WIDTH; x++) {
      const across = x === 1 || x === 2 ? 1 : 0.25;
      const i = (y * DROP_WIDTH + x) * 4;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = 255;
      image.data[i + 3] = Math.round(across * along * 255);
    }
  }
  ctx.putImageData(image, 0, 0);
  texture.refresh();
}

/**
 * A greyscale, opaque copy of a pattern texture, made once per game: brightness
 * (times alpha) as light, inverted if asked. Smooth-filtered, since the light map
 * samples it down. Returns its key.
 */
export function ensurePatternTexture(textures: Phaser.Textures.TextureManager, texture: string, invert: boolean): string {
  const key = patternTextureKey(texture, invert);
  if (textures.exists(key)) return key;
  const source = textures.get(texture).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const { width, height } = source;
  const canvasTexture = textures.createCanvas(key, width, height)!;
  const ctx = canvasTexture.getContext();
  ctx.drawImage(source, 0, 0);
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const v = Math.round(patternLight(data[i], data[i + 1], data[i + 2], data[i + 3], invert) * 255);
    data[i] = data[i + 1] = data[i + 2] = v;
    data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  canvasTexture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  canvasTexture.refresh();
  return key;
}
