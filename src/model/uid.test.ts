import { afterEach, describe, expect, it, vi } from 'vitest';
import { randomId } from './uid';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('randomId', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('makes v4 UUIDs', () => {
    expect(randomId()).toMatch(UUID_V4);
  });

  it('still works where crypto.randomUUID is missing (plain-http pages)', () => {
    vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto) });
    const ids = new Set(Array.from({ length: 200 }, randomId));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(id).toMatch(UUID_V4);
  });
});
