/**
 * Blip voices: the sound played as a line types out.
 *
 * - Message box lines are the player speaking, so they use `player`.
 * - `#display` lines are the character on stage speaking (the last `#enter`),
 *   so they use that character's key, e.g. `eji`.
 * - A line can pick a voice with `#voice <key>`, or go silent with `#voice none`.
 * - Anyone without an entry here uses DEFAULT_VOICE.
 *
 * `sounds` are keys in src/assets/audio/sfx; one is picked at random per blip,
 * never the same one twice in a row. `pitch` shifts them in cents (100 = one
 * semitone), so characters can share files and still sound different.
 */
export type Voice = {
  sounds: string[];
  pitch?: number;
  volume?: number;
};

export const DEFAULT_VOICE: Voice = {
  sounds: ['male_standard_1', 'male_standard_2', 'male_standard_3', 'male_standard_4'],
};

export const VOICES: Record<string, Voice> = {
  player: {
    sounds: ['female_standard_1', 'female_standard_2', 'female_standard_3', 'female_standard_4'],
  },
  witch: {
    sounds: ['female_standard_1', 'female_standard_2', 'female_standard_3', 'female_standard_4'],
    pitch: -300,
  },
};
