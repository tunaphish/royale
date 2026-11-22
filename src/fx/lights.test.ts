import { describe, expect, it } from 'vitest';
import {
  applyMotion, assignSlots, CandidatePool, flickerAt, moodBetween, newCandidate,
  newPointUniforms, packPointUniforms, pointLightCandidate,
} from './lights';
import type { LightingMood } from './types';

const STAGE = { width: 400, height: 400 };

/** A candidate at a rest position, at full intensity. */
const at = (x: number, y: number) => Object.assign(newCandidate(), { x, y, intensity: 1 });

describe('applyMotion: swing', () => {
  const swing = { kind: 'swing' as const, pivot: [0, -0.5] as [number, number], angle: 30, period: 4000 };

  it('rests below the pivot at the start and halfway through a swing', () => {
    for (const seconds of [0, 2]) {
      const c = at(200, 300);
      applyMotion(swing, STAGE.width, STAGE.height, seconds, c);
      expect(c.x).toBeCloseTo(200);
      expect(c.y).toBeCloseTo(300);
    }
  });

  it('swings out to the full angle either side, keeping its distance from the pivot', () => {
    const right = at(200, 300);
    const left = at(200, 300);
    applyMotion(swing, STAGE.width, STAGE.height, 1, right); // a quarter of the way: sin = 1
    applyMotion(swing, STAGE.width, STAGE.height, 3, left); // three quarters: sin = -1
    const pivot = { x: 200, y: 100 };
    const arm = 200;
    for (const c of [right, left]) {
      expect(Math.hypot(c.x - pivot.x, c.y - pivot.y)).toBeCloseTo(arm);
      expect(Math.abs(c.x - 200)).toBeCloseTo(arm * Math.sin(Math.PI / 6));
    }
    expect(Math.sign(right.x - 200)).toBe(-Math.sign(left.x - 200));
  });
});

describe('applyMotion: pass', () => {
  const pass = { kind: 'pass' as const, to: [0.5, 0.25] as [number, number], time: 1000, gap: 1000 };

  it('travels from its place by `to`, brightest halfway', () => {
    const start = at(0, 0);
    applyMotion(pass, STAGE.width, STAGE.height, 0, start);
    expect(start.intensity).toBeCloseTo(0);

    const middle = at(0, 0);
    applyMotion(pass, STAGE.width, STAGE.height, 0.5, middle);
    expect(middle.x).toBeCloseTo(100);
    expect(middle.y).toBeCloseTo(50);
    expect(middle.intensity).toBeCloseTo(1);
  });

  it('is off during the gap, then goes again', () => {
    const gap = at(0, 0);
    applyMotion(pass, STAGE.width, STAGE.height, 1.5, gap);
    expect(gap.intensity).toBe(0);

    const again = at(0, 0);
    applyMotion(pass, STAGE.width, STAGE.height, 2.5, again);
    expect(again.x).toBeCloseTo(100);
  });

  it('shifts its timing by `delay`', () => {
    const c = at(0, 0);
    applyMotion({ ...pass, delay: 500 }, STAGE.width, STAGE.height, 0, c);
    expect(c.x).toBeCloseTo(100);
  });
});

describe('flickerAt', () => {
  it('is steady without a flicker', () => {
    expect(flickerAt(undefined, 1.23, 0)).toBe(1);
    expect(flickerAt({ amount: 0, speed: 3 }, 1.23, 0)).toBe(1);
  });

  it('stays between 1 - amount and 1', () => {
    for (let t = 0; t < 5; t += 0.037) {
      const value = flickerAt({ amount: 0.3, speed: 4 }, t, 7);
      expect(value).toBeGreaterThanOrEqual(0.7 - 1e-9);
      expect(value).toBeLessThanOrEqual(1 + 1e-9);
    }
  });
});

describe('moodBetween', () => {
  const a: LightingMood = { ambient: '#000000', bands: 3, bandSoftness: 0 };
  const b: LightingMood = { ambient: '#ffffff', bands: 0, bandSoftness: 1 };

  it('blends the ambient color', () => {
    expect(moodBetween(a, b, 0).ambient).toBe('#000000');
    expect(moodBetween(a, b, 0.5).ambient).toBe('#808080');
    expect(moodBetween(a, b, 1).ambient).toBe('#ffffff');
  });

  it('switches steps halfway, since they can\'t blend', () => {
    expect(moodBetween(a, b, 0.49).bands).toBe(3);
    expect(moodBetween(a, b, 0.5).bands).toBe(0);
  });
});

describe('point slots', () => {
  const mood: LightingMood = { ambient: '#000000', bands: 3, bandSoftness: 0.2 };

  it('gives pinned lights slots first, then the brightest point lights', () => {
    const pool = new CandidatePool();
    const dim = Object.assign(pool.next(), { point: true, intensity: 0.2 });
    const bright = Object.assign(pool.next(), { point: true, intensity: 2 });
    const pinned = Object.assign(pool.next(), { point: true, pinned: true, intensity: 0.1 });
    const mapOnly = Object.assign(pool.next(), { point: false, intensity: 5 });

    expect(assignSlots(pool, 2)).toBe(2);
    expect(pinned.inSlot).toBe(true);
    expect(bright.inSlot).toBe(true);
    expect(dim.inSlot).toBe(false);
    expect(mapOnly.inSlot).toBe(false);
  });

  it('packs each light\'s own steps, or the mood\'s', () => {
    const pool = new CandidatePool();
    pointLightCandidate({ color: '#ffffff', intensity: 1, radius: 100, height: 0.2 }, 0, 0, 0, 0, pool.next());
    const own = pool.next();
    pointLightCandidate({ color: '#ffffff', intensity: 1, radius: 100, height: 0.2 }, 0, 0, 0, 0, own);
    own.bands = 1;
    own.bandSoftness = 0.5;
    own.behind = true;
    assignSlots(pool, 8);

    const uniforms = newPointUniforms();
    packPointUniforms(pool, uniforms, mood);
    const bySteps = [0, 1].map((slot) => [uniforms.bands[slot], uniforms.bandSoftness[slot], uniforms.behind[slot]]);
    expect(bySteps).toContainEqual([3, 0.2, 0]);
    expect(bySteps).toContainEqual([1, 0.5, 1]);
    expect(uniforms.intensity.slice(2).every((i) => i === 0)).toBe(true);
  });
});
