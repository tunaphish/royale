import { describe, expect, it } from 'vitest';
import { clampDisposition, dispositionBand } from './disposition';

describe('dispositionBand', () => {
  it.each([
    [-10, 'hostile'],
    [-6, 'hostile'],
    [-5, 'cold'],
    [-2, 'cold'],
    [-1, 'neutral'],
    [0, 'neutral'],
    [1, 'neutral'],
    [2, 'warm'],
    [5, 'warm'],
    [6, 'close'],
    [10, 'close'],
  ])('%i is %s', (value, band) => {
    expect(dispositionBand(value)).toBe(band);
  });
});

describe('clampDisposition', () => {
  it('keeps values in -10..10', () => {
    expect(clampDisposition(-15)).toBe(-10);
    expect(clampDisposition(3)).toBe(3);
    expect(clampDisposition(12)).toBe(10);
  });
});
