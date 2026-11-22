import type { SchoolData } from '../../model/school';
import { ACTIVITIES } from './activities';
import { EVENTS } from './events';
import { ITEMS } from './items';
import { LOCATIONS } from './locations';
import { STARS } from './stars';
import { STUDENTS } from './students';

/** Everything the school sim is made of. Checked at startup by `checkSchoolData`. */
export const SCHOOL: SchoolData = {
  items: ITEMS,
  locations: LOCATIONS,
  activities: ACTIVITIES,
  students: STUDENTS,
  stars: STARS,
  events: EVENTS,
};
