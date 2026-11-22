import { describe, expect, it } from 'vitest';
import { patternLight, patternTile } from './patterns';
import type { PatternLayerDef } from './types';

const layer = (extra: Partial<PatternLayerDef> = {}): PatternLayerDef =>
  ({ kind: 'pattern', texture: 't', color: '#ffffff', intensity: 1, ...extra });
const tile = () => ({ x: 0, y: 0, width: 0, height: 0 });

describe('patternTile', () => {
  it('sizes a copy from the stage width and the texture shape', () => {
    const out = tile();
    patternTile(layer({ scale: 0.5 }), 2, 400, 300, 0, 0, false, out);
    expect(out.width).toBe(200);
    expect(out.height).toBe(400);
  });

  it('starts at or before the stage corner, so copies cover it', () => {
    const out = tile();
    for (const offset of [[0, 0], [0.3, -0.7], [-2.5, 4.2]] as [number, number][]) {
      patternTile(layer({ offset }), 1, 400, 300, 0, 0, false, out);
      expect(out.x).toBeLessThanOrEqual(0);
      expect(out.x).toBeGreaterThan(-out.width - 1e-9);
      expect(out.y).toBeLessThanOrEqual(0);
      expect(out.y).toBeGreaterThan(-out.height - 1e-9);
    }
  });

  it('sways within its reach, and stays put when still', () => {
    const sway = { reach: [0.01, 0] as [number, number], speed: 1 };
    const base = tile();
    patternTile(layer(), 1, 400, 300, 0, 0, false, base);
    const out = tile();
    patternTile(layer({ sway }), 1, 400, 300, 0.25, 0, false, out);
    // a quarter of a sway at 1/s: sin(π/2) = 1, so 0.01 * 400 = 4px
    expect(out.x - base.x === 4 || out.x - base.x === 4 - out.width).toBe(true);
    patternTile(layer({ sway }), 1, 400, 300, 0.25, 0, true, out);
    expect(out.x).toBe(base.x);
  });
});

describe('patternLight', () => {
  it('is brightness, with transparent as dark', () => {
    expect(patternLight(255, 255, 255, 255, false)).toBe(1);
    expect(patternLight(255, 255, 255, 0, false)).toBe(0);
    expect(patternLight(0, 0, 0, 255, false)).toBe(0);
    expect(patternLight(0, 0, 0, 255, true)).toBe(1);
  });
});
