import { describe, expect, it } from 'vitest';
import { checkSchoolData } from './schoolValidate';
import { when } from './conditions';
import type { SchoolData } from './school';

const valid = (): SchoolData => ({
  items: { pie: { name: 'Pie', price: 5 } },
  locations: { cafeteria: { name: 'Cafeteria' } },
  activities: {
    'hang-out': {
      name: 'Hang out',
      location: 'cafeteria',
      with: 'student',
      when: when.band('warm'),
      effects: [{ kind: 'disposition', amount: 1 }],
    },
  },
  students: { rena: { name: 'Rena', schedule: { sat: { morning: 'cafeteria' } }, gifts: { loved: ['pie'], hated: [] } } },
  stars: { 'rena-1': { student: 'rena', name: 'One', hint: '', scene: 'rena-1', when: when.rank('charm', 2) } },
  events: { rain: { name: 'Rain', scene: 'rain' } },
});

describe('checkSchoolData', () => {
  it('passes valid data', () => {
    expect(checkSchoolData(valid(), ['rena-1', 'rain'])).toEqual([]);
  });

  it('finds missing IDs, stories and bad numbers', () => {
    const data = valid();
    data.activities['hang-out'].location = 'moon';
    data.students.rena.schedule.sun = { morning: [{ location: 'attic', weight: 0 }] };
    data.students.rena.gifts.hated.push('onion');
    data.stars['rena-1'].when = when.all(when.star('rena-0'), when.rank('charm', 6));
    data.events.rain.effects = [{ kind: 'item', item: 'umbrella', amount: 1 }];

    expect(checkSchoolData(data, ['rena-1'])).toEqual([
      'activity "hang-out": no location "moon"',
      'student "rena" sun morning: no location "attic"',
      'student "rena" sun morning: weights must be > 0',
      'student "rena" gifts: no item "onion"',
      'star "rena-1": no star "rena-0"',
      'star "rena-1": rank must be 1-5',
      'event "rain": no item "umbrella"',
      'event "rain": no story "rain" (add scripts/stories/rain.ink)',
    ]);
  });

  it('finds stars that need themselves', () => {
    const data = valid();
    data.stars['rena-2'] = { student: 'rena', name: 'Two', hint: '', scene: 'rena-1', when: when.star('rena-1') };
    data.stars['rena-1'].when = when.star('rena-2');
    expect(checkSchoolData(data, ['rena-1', 'rain'])).toEqual([
      'star "rena-1": needs itself (through the stars it needs), so it can never light',
      'star "rena-2": needs itself (through the stars it needs), so it can never light',
    ]);
  });

  it('finds student conditions and effects where no student is involved', () => {
    const data = valid();
    data.events.rain.when = when.band('warm');
    data.events.rain.effects = [{ kind: 'disposition', amount: 1 }];
    data.activities['hang-out'].with = undefined;

    expect(checkSchoolData(data, ['rena-1', 'rain'])).toEqual([
      'activity "hang-out": "band" condition needs a student; none is involved here',
      'activity "hang-out": "disposition" effect needs a student; none is involved here',
      'event "rain": "band" condition needs a student; none is involved here',
      'event "rain": "disposition" effect needs a student; none is involved here',
    ]);
  });
});
