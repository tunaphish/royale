import { IMAGES, MUSIC, SFX } from '../../assets/manifest';
import { FX } from '../../data/fx';
import { LIGHTING } from '../../data/lighting';
import { VOICES } from '../../data/voices';
import type { TagAssets } from '../../model/storyTags';

/** What ink tags can refer to: the asset manifest and `data/`. */
export const TAG_ASSETS: TagAssets = {
  image: (key) => key in IMAGES,
  sound: (key) => key in SFX,
  song: (key) => key in MUSIC,
  fx: (id) => id in FX,
  mood: (id) => id in LIGHTING,
  voice: (key) => key in VOICES,
};
