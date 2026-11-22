import type { LocationDef } from '../../model/school';
import { when } from '../../model/conditions';

/** Places on campus. Open in every slot unless `open` says otherwise. */
export const LOCATIONS: Record<string, LocationDef> = {
  classroom: { name: 'Classroom' },
  training: { name: 'Training grounds' },
  library: { name: 'Library' },
  cafeteria: { name: 'Cafeteria' },
  town: { name: 'Town', open: when.weekend() },
  dorm: { name: 'Dorm' },
};
