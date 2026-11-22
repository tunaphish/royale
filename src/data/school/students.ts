import type { StudentDef } from '../../model/school';

/**
 * The slice's students: where they are each slot and what gifts they like.
 * Keys match their art in images/characters/ and their voices in data/voices.ts.
 * Slots left out are off campus. Placeholder schedules and gifts.
 */
export const STUDENTS: Record<string, StudentDef> = {
  eji: {
    name: 'Eji',
    schedule: {
      sat: { morning: 'training', afternoon: 'town' },
      sun: { morning: 'training', afternoon: [{ location: 'cafeteria', weight: 1 }, { location: 'dorm', weight: 1 }] },
      mon: { morning: 'classroom', afternoon: 'training' },
      tue: { morning: 'classroom', afternoon: 'cafeteria' },
      wed: { morning: 'training', afternoon: 'training' },
      thu: { morning: 'classroom', afternoon: [{ location: 'training', weight: 2 }, { location: null, weight: 1 }] },
    },
    gifts: { loved: ['whetstone'], hated: ['pressed-flower'] },
  },
  rena: {
    name: 'Rena',
    schedule: {
      sat: { morning: 'cafeteria', afternoon: 'town' },
      sun: { afternoon: 'dorm' },
      mon: { morning: 'classroom', afternoon: 'cafeteria' },
      tue: { morning: 'classroom', afternoon: [{ location: 'library', weight: 1 }, { location: 'cafeteria', weight: 1 }] },
      wed: { morning: 'classroom', afternoon: 'cafeteria' },
      thu: { morning: 'classroom', afternoon: 'dorm' },
    },
    gifts: { loved: ['sweet-bun', 'pressed-flower'], hated: ['cheap-cologne'] },
  },
  witch: {
    name: 'The Witch',
    schedule: {
      sat: { morning: 'library', afternoon: 'library' },
      sun: { morning: 'dorm' },
      mon: { afternoon: 'library' },
      tue: { morning: 'classroom', afternoon: 'library' },
      wed: { morning: [{ location: 'library', weight: 1 }, { location: null, weight: 1 }], afternoon: 'training' },
      thu: { morning: 'library', afternoon: 'library' },
    },
    gifts: { loved: ['old-grimoire'], hated: ['sweet-bun'] },
  },
};
