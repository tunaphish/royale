import type { LocationDef } from '../../model/school';
import { when } from '../../model/conditions';

/** On the stage while no location is picked (the map, day events). A file in images/backgrounds/, like `#bg`. Placeholder art. */
export const CAMPUS_BACKGROUND = 'forest';

/** Places on campus. Open in every slot unless `open` says otherwise. Placeholder backgrounds. */
export const LOCATIONS: Record<string, LocationDef> = {
  classroom: { name: 'Classroom', background: 'background' },
  training: { name: 'Training grounds', background: 'pikrepo' },
  library: { name: 'Library', background: 'background' },
  cafeteria: { name: 'Cafeteria', background: 'supermarket' },
  town: { name: 'Town', background: 'pikrepo', open: when.weekend() },
  dorm: { name: 'Dorm', background: 'main-menu' },
};
