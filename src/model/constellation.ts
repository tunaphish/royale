import type { Condition } from './conditions';
import type { SchoolData } from './school';

/**
 * Where everything sits in the constellation view: the player in the middle,
 * each student around them, and each student's stars further out, a star
 * after the stars it needs. Positions are in -1..1 both ways, worked out from
 * the data alone, so a new star finds its own place.
 */

export type ConstellationNode =
  | { kind: 'player'; id: 'player'; x: number; y: number }
  | { kind: 'student'; id: string; x: number; y: number }
  | { kind: 'star'; id: string; student: string; x: number; y: number };

export type ConstellationEdge = { from: string; to: string };

export type ConstellationLayout = { nodes: ConstellationNode[]; edges: ConstellationEdge[] };

const STUDENT_RADIUS = 0.3;
const DEPTH_STEP = 0.2;
/** How far apart (radians) stars at the same depth spread around their student's direction. */
const SPREAD = 0.45;

/** The stars a condition needs to be lit (ignoring those under `not`). */
export const requiredStars = (condition: Condition | undefined): string[] => {
  if (!condition) return [];
  switch (condition.kind) {
    case 'star':
      return [condition.star];
    case 'all':
      return condition.all.flatMap(requiredStars);
    case 'any':
      return condition.any.flatMap(requiredStars);
    default:
      return [];
  }
};

export const constellationLayout = (data: SchoolData): ConstellationLayout => {
  const nodes: ConstellationNode[] = [{ kind: 'player', id: 'player', x: 0, y: 0 }];
  const edges: ConstellationEdge[] = [];
  const studentIds = Object.keys(data.students);

  /** 1 for stars that need no other star, else one more than the deepest star they need. */
  const depths = new Map<string, number>();
  const depthOf = (star: string, seen = new Set<string>()): number => {
    const known = depths.get(star);
    if (known !== undefined) return known;
    if (seen.has(star)) return 1; // a loop in the data, which checkSchoolData reports
    seen.add(star);
    const needs = requiredStars(data.stars[star]?.when).filter((id) => id in data.stars);
    const depth = needs.length === 0 ? 1 : 1 + Math.max(...needs.map((id) => depthOf(id, seen)));
    depths.set(star, depth);
    return depth;
  };

  studentIds.forEach((student, i) => {
    const angle = -Math.PI / 2 + (i / studentIds.length) * Math.PI * 2;
    nodes.push({ kind: 'student', id: student, x: Math.cos(angle) * STUDENT_RADIUS, y: Math.sin(angle) * STUDENT_RADIUS });
    edges.push({ from: 'player', to: student });

    const stars = Object.keys(data.stars).filter((id) => data.stars[id].student === student);
    const byDepth = new Map<number, string[]>();
    for (const star of stars) {
      const depth = depthOf(star);
      byDepth.set(depth, [...(byDepth.get(depth) ?? []), star]);
    }
    for (const [depth, atDepth] of byDepth) {
      atDepth.forEach((star, j) => {
        const offset = (j - (atDepth.length - 1) / 2) * SPREAD;
        const radius = STUDENT_RADIUS + depth * DEPTH_STEP;
        nodes.push({
          kind: 'star', id: star, student,
          x: Math.cos(angle + offset / depth) * radius,
          y: Math.sin(angle + offset / depth) * radius,
        });
        const needs = requiredStars(data.stars[star].when).filter((id) => data.stars[id]?.student === student);
        if (needs.length === 0) edges.push({ from: student, to: star });
        for (const need of needs) edges.push({ from: need, to: star });
      });
    }
  });

  return { nodes, edges };
};
