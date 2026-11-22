import { calendarAt, DAY_NAMES } from './calendar';
import type { DispositionBand } from './disposition';
import type { Change, SchoolData } from './school';
import { SOCIAL_STAT_NAMES } from './socialStats';

/** Words for the school's numbers and changes, for the screen. */

export const BAND_NAMES: Record<DispositionBand, string> = {
  hostile: 'Hostile',
  cold: 'Cold',
  neutral: 'Neutral',
  warm: 'Warm',
  close: 'Close',
};

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

/** "Monday afternoon" */
export const slotName = (time: number): string => {
  const { day, slot } = calendarAt(time);
  return `${DAY_NAMES[day]} ${slot}`;
};

export const studentName = (data: SchoolData, student: string): string => data.students[student]?.name ?? student;

/** An intel ID as words: `deck:rena` is "Rena's deck". */
export const intelName = (data: SchoolData, names: Record<string, string>, intel: string): string => {
  const [base, student] = intel.split(':');
  const name = names[base] ?? base;
  return student ? name.replace('{student}', studentName(data, student)) : name;
};

/** One line per change: "Wit +2, rank 2!", "Rena +1, now Warm". */
export const describeChange = (data: SchoolData, intelNames: Record<string, string>, change: Change): string => {
  switch (change.kind) {
    case 'stat': {
      const line = `${SOCIAL_STAT_NAMES[change.stat]} ${signed(change.points)}`;
      return change.rankAfter > change.rankBefore ? `${line}, rank ${change.rankAfter}!` : line;
    }
    case 'disposition': {
      const line = `${studentName(data, change.student)} ${signed(change.amount)}`;
      return change.bandAfter !== change.bandBefore ? `${line}, now ${BAND_NAMES[change.bandAfter]}` : line;
    }
    case 'mood':
      return change.slots > 0
        ? `${studentName(data, change.student)} is ${change.mood}`
        : `${studentName(data, change.student)} is no longer ${change.mood}`;
    case 'gold':
      return `Gold ${signed(change.amount)}`;
    case 'item': {
      const name = data.items[change.item]?.name ?? change.item;
      return change.amount > 0 ? `Got: ${name}${change.amount > 1 ? ` ×${change.amount}` : ''}` : `Gave away: ${name}`;
    }
    case 'intel':
      return `Learned: ${intelName(data, intelNames, change.intel)}`;
    case 'loseSlots':
      return `Lost: ${change.times.map(slotName).join(', ')}`;
    case 'star':
      return `★ ${data.stars[change.star]?.name ?? change.star}`;
    case 'history':
      return `${studentName(data, change.student)} won't forget: ${change.event}`;
  }
};
