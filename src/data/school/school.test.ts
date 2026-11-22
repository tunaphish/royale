import { describe, expect, it } from 'vitest';
import { SCHOOL } from '.';
import { IMAGES, STORY_KEYS } from '../../assets/manifest';
import { checkSchoolData } from '../../model/schoolValidate';
import { STARS } from './stars';
import { CAMPUS_BACKGROUND } from './locations';
import { STUDENTS } from './students';

/** The real school data passes the same check Boot runs. */
describe('school data', () => {
  it('has no problems', () => {
    expect(checkSchoolData(SCHOOL, STORY_KEYS, Object.keys(IMAGES))).toEqual([]);
  });

  it('has art for the campus view', () => {
    expect(`backgrounds/${CAMPUS_BACKGROUND}` in IMAGES).toBe(true);
  });

  it('gives every student some stars', () => {
    for (const id of Object.keys(STUDENTS)) {
      expect(Object.values(STARS).filter((star) => star.student === id).length).toBeGreaterThan(0);
    }
  });
});
