/**
 * A repeatable roll in [0, 1) from a seed and any keys: the same inputs always
 * give the same roll. Used where a random result has to survive a reload,
 * like where a student is this slot. (FNV-1a, then a final mix.)
 */
export const seededRoll = (seed: number, ...keys: (string | number)[]): number => {
  let hash = 0x811c9dc5 ^ seed;
  const text = keys.join('|');
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  return (hash >>> 0) / 0x100000000;
};

/** An item from a weighted list, by a roll in [0, 1). */
export const pickWeighted = <T>(items: readonly T[], weight: (item: T) => number, roll: number): T | undefined => {
  let total = 0;
  for (const item of items) total += weight(item);
  let left = roll * total;
  for (const item of items) {
    left -= weight(item);
    if (left < 0) return item;
  }
  return items[items.length - 1];
};
