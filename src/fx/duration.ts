import type { Duration, FxDef } from './types';

/** The duration an FX runs for: the play override, else its own. */
export const resolveDuration = (def: FxDef, override?: Duration): Duration => override ?? def.duration;

/** Default prewarm when an FX says `prewarm: true`. */
export const DEFAULT_PREWARM = 3000;

/** How many ms to simulate before the first frame. */
export const prewarmMs = (def: FxDef): number =>
  def.prewarm === true ? DEFAULT_PREWARM : typeof def.prewarm === 'number' ? def.prewarm : 0;
