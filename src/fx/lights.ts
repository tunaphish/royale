import { channels, colorInt } from './random';
import type { Flicker, LightingMood, LightMotion, MoodLight } from './types';

/** Lights that use normal maps. A shader constant: changing it recompiles every lit material. */
export const POINT_SLOTS = 8;

/**
 * One light this frame, from a mood, a scene light or a particle. Candidates are
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
  /** Between the background and the characters: only rims characters. See `MoodLight.behind`. */
  behind: boolean;
  /** Mood and scene lights: always get a slot before particles do. */
  pinned: boolean;
  priority: number;
  /** Set by `assignSlots`. */
  inSlot: boolean;
}

export const newCandidate = (): LightCandidate => ({
  x: 0, y: 0, z: 0, radius: 1, intensity: 0, r: 0, g: 0, b: 0,
  point: false, behind: false, pinned: false, priority: 1, inSlot: false,
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
}

export const newPointUniforms = (): PointUniforms => ({
  pos: new Array(POINT_SLOTS * 3).fill(0),
  color: new Array(POINT_SLOTS * 3).fill(0),
  radius: new Array(POINT_SLOTS).fill(1),
  intensity: new Array(POINT_SLOTS).fill(0),
  behind: new Array(POINT_SLOTS).fill(0),
});

/** Writes the slotted lights into `out`; unused slots get no intensity. */
export function packPointUniforms(pool: CandidatePool, out: PointUniforms): void {
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
 * Moves a light already placed at its `at` (in `out.x`/`out.y`, pixels) by its
 * motion at `time` (seconds), and scales `out.intensity` for fades.
 */
export function applyMotion(motion: LightMotion, width: number, height: number, time: number, out: LightCandidate): void {
  const ms = time * 1000;
  if (motion.kind === 'swing') {
    const px = motion.pivot[0] * width;
    const py = motion.pivot[1] * height;
    const dx = out.x - px;
    const dy = out.y - py;
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
  out.x += (motion.to[0] * width - out.x) * t;
  out.y += (motion.to[1] * height - out.y) * t;
  out.intensity *= Math.sin(Math.PI * t);
}

/** Writes a mood light into a candidate. `width`/`height` are the stage size, `time` is in seconds. */
export function moodLightCandidate(light: MoodLight, width: number, height: number, time: number, seed: number, out: LightCandidate): void {
  out.x = light.at[0] * width;
  out.y = light.at[1] * height;
  out.radius = light.radius;
  out.z = light.height * light.radius;
  out.intensity = light.intensity * flickerAt(light.flicker, time, seed);
  if (light.motion) applyMotion(light.motion, width, height, time, out);
  channels(colorInt(light.color), out);
  out.point = true;
  out.behind = light.behind ?? false;
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

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * The mood `t` of the way from `a` to `b`. Lights pair up by index; a light with
 * no partner fades in or out. Steps, `behind` and motion switch halfway, since they can't blend.
 * The result has no `fx`: `FxSystem` starts a mood's FX when the fade begins.
 * Allocates, but only while a fade is running.
 */
export function moodBetween(a: LightingMood, b: LightingMood, t: number): LightingMood {
  const count = Math.max(a.lights.length, b.lights.length);
  const lights: MoodLight[] = [];
  for (let i = 0; i < count; i++) {
    const la = a.lights[i] ?? { ...b.lights[i], intensity: 0 };
    const lb = b.lights[i] ?? { ...a.lights[i], intensity: 0 };
    lights.push({
      color: mixColor(la.color, lb.color, t),
      intensity: lerp(la.intensity, lb.intensity, t),
      radius: lerp(la.radius, lb.radius, t),
      height: lerp(la.height, lb.height, t),
      at: [lerp(la.at[0], lb.at[0], t), lerp(la.at[1], lb.at[1], t)],
      flicker: t < 0.5 ? la.flicker : lb.flicker,
      behind: t < 0.5 ? la.behind : lb.behind,
      motion: t < 0.5 ? la.motion : lb.motion,
    });
  }
  const late = t >= 0.5;
  return {
    ambient: mixColor(a.ambient, b.ambient, t),
    lights,
    bands: late ? b.bands : a.bands,
    bandSoftness: late ? b.bandSoftness : a.bandSoftness,
  };
}
