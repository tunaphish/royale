/**
 * Characters who can speak in ink scripts. A line is only read as speech when
 * it starts with one of these keys: `eji: text`. Anything else is narration,
 * so a line like `Note: ...` stays narration.
 */
export const CHARACTERS: Record<string, { name: string }> = {
  eji: { name: 'Eji' },
  makoto: { name: 'Makoto' },
  rise: { name: 'Rise' },
  estelle: { name: 'Estelle' },
  sei: { name: 'Sei' },
  rock: { name: 'Rock' },
  ava: { name: 'Ava' },
};
