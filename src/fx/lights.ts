import { channels, colorInt } from './random';
import type { Flicker, LightingMood, LightMotion, PointLightDef } from './types';

/** Lights that use normal maps. A shader constant: changing it recompiles every lit material. */
export const POINT_SLOTS = 8;

/**
 * One light this frame, from a scene light, an FX light layer or a particle. Candidates are
 * pooled and rewritten every frame, so lighting allocates nothing per frame.
 * Positions are in screen pixels; `z` is height above the art.
 */
export interface LightCandidate {
  x: number;
  y: number;
  z: number;
  radius: number;
  intensity: number;
  r: number;
  g: number;
  b: number;
  /** Wants a point slot. Map lights never get one. */
  point: boolean;
  /** Between the background and the characters: only rims characters. See `LightLayerDef.behind`. */
  behind: boolean;
  /** Light steps and step edge for this light; -1 uses the mood's. */
  bands: number;
  bandSoftness: number;
  /** Scene lights and FX light layers: always get a slot before particles do. */
  pinned: boolean;
  priority: number;
  /** Set by `assignSlots`. */
  inSlot: boolean;
}

export const newCandidate = (): LightCandidate => ({
  x: 0, y: 0, z: 0, radius: 1, intensity: 0, r: 0, g: 0, b: 0,
  point: false, behind: false, bands: -1, bandSoftness: -1, pinned: false, priority: 1, inSlot: false,
});

/** Grows as needed and is reused every frame. */
export class CandidatePool {
  readonly items: LightCandidate[] = [];
  count = 0;

  next(): LightCandidate {
    if (this.count === this.items.length) this.items.push(newCandidate());
    const candidate = this.items[this.count++];
    candidate.pinned = false;
    candidate.behind = false;
    candidate.bands = -1;
    candidate.bandSoftness = -1;
    candidate.priority = 1;
    candidate.inSlot = false;
    return candidate;
  }

  reset(): void {
    this.count = 0;
  }
}

const score = (c: LightCandidate) => (c.pinned ? Infinity : c.intensity * c.priority);

/**
 * Gives point slots to pinned lights first, then the brightest point lights.
 * Sorts `pool.items[0..count)` in place and sets `inSlot`. Everything without
 * a slot is drawn into the light map instead. Returns the number of slots used.
 */
export function assignSlots(pool: CandidatePool, slots: number): number {
  const live = pool.items;
  // Insertion sort on the live range: allocation-free, and the list is short and mostly ordered frame to frame.
  for (let i = 1; i < pool.count; i++) {
    const item = live[i];
    const s = score(item);
    let j = i - 1;
    while (j >= 0 && score(live[j]) < s) {
      live[j + 1] = live[j];
      j--;
    }
    live[j + 1] = item;
  }
  let used = 0;
  for (let i = 0; i < pool.count; i++) {
    const c = live[i];
    if (c.point && used < slots && c.intensity > 0) {
      c.inSlot = true;
      used++;
    }
  }
  return used;
}

/** Uniform arrays for the point slots, allocated once. */
export interface PointUniforms {
  pos: number[];
  color: number[];
  radius: number[];
  intensity: number[];
  /** 1 for lights behind the characters, else 0. */
  behind: number[];
  /** Each light's steps and step edge, the mood's filled in where a light has none. */
  bands: number[];
  bandSoftness: number[];
}

export const newPointUniforms = (): PointUniforms => ({
  pos: new Array(POINT_SLOTS * 3).fill(0),
  color: new Array(POINT_SLOTS * 3).fill(0),
  radius: new Array(POINT_SLOTS).fill(1),
  intensity: new Array(POINT_SLOTS).fill(0),
  behind: new Array(POINT_SLOTS).fill(0),
  bands: new Array(POINT_SLOTS).fill(0),
  bandSoftness: new Array(POINT_SLOTS).fill(0),
});

/** Writes the slotted lights into `out`; unused slots get no intensity. Lights without their own steps get the mood's. */
export function packPointUniforms(pool: CandidatePool, out: PointUniforms, mood: LightingMood): void {
  out.intensity.fill(0);
  let slot = 0;
  for (let i = 0; i < pool.count && slot < POINT_SLOTS; i++) {
    const c = pool.items[i];
    if (!c.inSlot) continue;
    out.pos[slot * 3] = c.x;
    out.pos[slot * 3 + 1] = c.y;
    out.pos[slot * 3 + 2] = c.z;
    out.color[slot * 3] = c.r;
    out.color[slot * 3 + 1] = c.g;
    out.color[slot * 3 + 2] = c.b;
    out.radius[slot] = Math.max(c.radius, 1);
    out.intensity[slot] = c.intensity;
    out.behind[slot] = c.behind ? 1 : 0;
    out.bands[slot] = c.bands >= 0 ? c.bands : mood.bands;
    out.bandSoftness[slot] = c.bandSoftness >= 0 ? c.bandSoftness : mood.bandSoftness;
    slot++;
  }
}

/** Brightness multiplier for a flickering light at `time` (seconds). `seed` keeps lights out of sync. */
export function flickerAt(flicker: Flicker | undefined, time: number, seed: number): number {
  if (!flicker || flicker.amount <= 0) return 1;
  const t = time * flicker.speed * Math.PI * 2;
  // Two out-of-step waves read as irregular without a noise texture.
  const wave = (Math.sin(t + seed) * Math.sin(t * 1.73 + seed * 2.31) + 1) / 2;
  return 1 - flicker.amount * wave;
}

/**
 * Moves a light already placed at its rest position (`out.x`/`out.y`, pixels) by
 * its motion at `time` (seconds), and scales `out.intensity` for fades. Motion
 * points are stage fractions measured from the rest position.
 */
export function applyMotion(motion: LightMotion, width: number, height: number, time: number, out: LightCandidate): void {
  const ms = time * 1000;
  if (motion.kind === 'swing') {
    // the light hangs below the pivot: rotate the pivot-to-light arm
    const dx = -motion.pivot[0] * width;
    const dy = -motion.pivot[1] * height;
    const px = out.x - dx;
    const py = out.y - dy;
    const period = Math.max(motion.period, 1);
    const angle = (motion.angle * Math.PI / 180) * Math.sin((ms / period) * Math.PI * 2);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    out.x = px + dx * cos - dy * sin;
    out.y = py + dx * sin + dy * cos;
    return;
  }
  const travel = Math.max(motion.time, 1);
  const cycle = travel + Math.max(motion.gap ?? 0, 0);
  const local = (((ms + (motion.delay ?? 0)) % cycle) + cycle) % cycle;
  if (local >= travel) {
    out.intensity = 0;
    return;
  }
  const t = local / travel;
  out.x += motion.to[0] * width * t;
  out.y += motion.to[1] * height * t;
  out.intensity *= Math.sin(Math.PI * t);
}

/** Writes a steady light at (`x`, `y`) into a candidate. `time` is in seconds; `seed` keeps flickers out of sync. */
export function pointLightCandidate(light: PointLightDef, x: number, y: number, time: number, seed: number, out: LightCandidate): void {
  out.x = x;
  out.y = y;
  out.radius = light.radius;
  out.z = light.height * light.radius;
  out.intensity = light.intensity * flickerAt(light.flicker, time, seed);
  channels(colorInt(light.color), out);
  out.point = true;
  out.pinned = true;
}

const mixColor = (a: string, b: string, t: number): string => {
  const ca = colorInt(a);
  const cb = colorInt(b);
  let result = 0;
  for (const shift of [16, 8, 0]) {
    const va = (ca >> shift) & 0xff;
    const vb = (cb >> shift) & 0xff;
    result |= Math.round(va + (vb - va) * t) << shift;
  }
  return `#${result.toString(16).padStart(6, '0')}`;
};

/**
 * The mood `t` of the way from `a` to `b`: the ambient color blends, steps
 * switch halfway since they can't blend. Allocates, but only while a fade runs.
 */
export function moodBetween(a: LightingMood, b: LightingMood, t: number): LightingMood {
  const late = t >= 0.5;
  return {
    ambient: mixColor(a.ambient, b.ambient, t),
    bands: late ? b.bands : a.bands,
    bandSoftness: late ? b.bandSoftness : a.bandSoftness,
  };
}
