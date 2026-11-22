import type { PatternLayerDef } from './types';

/** One copy of a pattern texture drawn into the light map this frame. Pooled, like light candidates. */
export interface PatternStamp {
  /** Texture key (the prepared one, see `patternTextureKey`). */
  key: string;
  /** Top-left and size, in screen pixels. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** `0xrrggbb`. */
  tint: number;
  intensity: number;
}

/** Grows as needed and is reused every frame. */
export class StampPool {
  readonly items: PatternStamp[] = [];
  count = 0;

  next(): PatternStamp {
    if (this.count === this.items.length) this.items.push({ key: '', x: 0, y: 0, width: 1, height: 1, tint: 0xffffff, intensity: 0 });
    return this.items[this.count++];
  }

  reset(): void {
    this.count = 0;
  }
}

/**
 * Where one copy of a pattern starts and how big it is: the top-left copy, so
 * that copies from there to the right and down cover the stage. Moves with
 * time when the pattern sways. Allocates nothing.
 * `aspect` is the texture's height / width; `seed` keeps patterns out of step.
 */
export function patternTile(
  layer: PatternLayerDef, aspect: number, width: number, height: number,
  timeSeconds: number, seed: number, still: boolean,
  out: { x: number; y: number; width: number; height: number },
): void {
  const tileW = Math.max(width * (layer.scale ?? 1), 1);
  const tileH = Math.max(tileW * aspect, 1);
  let shiftX = (layer.offset?.[0] ?? 0) * tileW;
  let shiftY = (layer.offset?.[1] ?? 0) * tileH;
  const sway = layer.sway;
  if (sway && !still) {
    const omega = sway.speed * Math.PI * 2;
    // Different rates on x and y, so it wanders instead of sliding along one line.
    shiftX += sway.reach[0] * width * Math.sin(omega * timeSeconds + seed);
    shiftY += sway.reach[1] * height * Math.sin(omega * 0.71 * timeSeconds + seed * 1.7);
  }
  // Start at or left of / above the stage's corner.
  out.x = mod(shiftX, tileW) - tileW;
  out.y = mod(shiftY, tileH) - tileH;
  out.width = tileW;
  out.height = tileH;
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

/** Light from one pixel of a pattern texture: brightness, with transparent as dark. 0 to 1. */
export function patternLight(r: number, g: number, b: number, a: number, invert: boolean): number {
  const light = ((r + g + b) / (3 * 255)) * (a / 255);
  return invert ? 1 - light : light;
}

/** Key of the prepared (greyscale, opaque) copy of a pattern texture. */
export const patternTextureKey = (texture: string, invert: boolean): string =>
  `fx-pattern/${texture}${invert ? '/inverted' : ''}`;
