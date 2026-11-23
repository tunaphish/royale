import type { LocationDef } from '../../model/school';
import { when } from '../../model/conditions';

/**
 * Places on campus. Open in every slot unless `open` says otherwise.
 * Placeholder backgrounds. Lighting is daytime (school slots are mornings and
 * afternoons); scenes played at a place start in its lighting.
 */
export const LOCATIONS: Record<string, LocationDef> = {
  // sun through tall windows, dust in the air
  classroom: { name: 'Classroom', background: 'background', lighting: { mood: 'dim', fx: ['god-rays'] } },
  // a yard under the trees
  training: { name: 'Training grounds', background: 'pikrepo', lighting: { mood: 'forest-day', fx: ['dappled-light'] } },
  // deep stacks, read by candle
  library: { name: 'Library', background: 'background', lighting: { mood: 'dim', fx: ['candlelight'] } },
  // warm, from the kitchen fires
  cafeteria: { name: 'Cafeteria', background: 'supermarket', lighting: { mood: 'dim', fx: ['warm-light'] } },
  // a weekend afternoon, the sun low behind whoever you meet
  town: { name: 'Town', background: 'pikrepo', open: when.weekend(), lighting: { mood: 'dim', fx: ['god-rays-behind'] } },
  // a quiet room, soft light from the window
  dorm: { name: 'Dorm', background: 'main-menu', lighting: { mood: 'dim', fx: ['soft-light'] } },
};
