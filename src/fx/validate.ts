import type * as Phaser from 'phaser';
import { FX } from '../data/fx';
import { LIGHTING } from '../data/lighting';
import { isColor } from './random';
import { builtinNames, isBuiltin } from './textures';
import type { ColorChoice } from './types';

/**
 * Checks what TypeScript can't: sprite keys exist, colors parse, moods are
 * sane. Boot calls it after loading, so bad data fails at startup.
 */
export function checkFxData(textures: Phaser.Textures.TextureManager): void {
  const problems: string[] = [];
  const color = (where: string, value: string) => {
    if (!isColor(value)) problems.push(`${where}: "${value}" isn't a #rrggbb color`);
  };
  const colorChoice = (where: string, choice: ColorChoice) =>
    color(where, typeof choice === 'string' ? choice : choice.color);

  for (const [id, def] of Object.entries(FX)) {
    if (def.layers.length === 0) problems.push(`fx "${id}": no layers`);
    if (typeof def.duration === 'number' && def.duration <= 0) problems.push(`fx "${id}": duration must be > 0 or 'infinite'`);
    def.layers.forEach((layer, i) => {
      const where = `fx "${id}" layer ${i}`;
      if (layer.kind === 'particles') {
        if (isBuiltin(layer.sprite)) {
          const name = layer.sprite.slice('builtin:'.length);
          if (!(builtinNames as string[]).includes(name)) problems.push(`${where}: no built-in sprite "${name}" (have: ${builtinNames.join(', ')})`);
        } else if (!textures.exists(layer.sprite)) {
          problems.push(`${where}: no image "${layer.sprite}" (put it in src/assets/images/)`);
        }
        if (layer.colors.length === 0) problems.push(`${where}: needs at least one color`);
        layer.colors.forEach((c) => colorChoice(where, c));
        if (!layer.rate && !layer.burst) problems.push(`${where}: needs a rate or a burst, or it never spawns`);
        if (layer.endSize !== undefined && layer.endSize < 0) problems.push(`${where}: endSize can't be negative`);
        if (layer.sway && layer.sway.speed <= 0) problems.push(`${where}: sway speed must be > 0`);
      } else if (layer.kind === 'light') {
        color(where, layer.color);
        if (layer.radius <= 0) problems.push(`${where}: radius must be > 0`);
        const motion = layer.motion;
        if (motion?.kind === 'swing' && motion.period <= 0) problems.push(`${where}: swing period must be > 0`);
        if (motion?.kind === 'pass' && motion.time <= 0) problems.push(`${where}: pass time must be > 0`);
      } else if (layer.kind === 'pattern') {
        if (!textures.exists(layer.texture)) problems.push(`${where}: no image "${layer.texture}" (put it in src/assets/images/)`);
        color(where, layer.color);
        if (layer.intensity < 0) problems.push(`${where}: intensity can't be negative`);
        if (layer.scale !== undefined && layer.scale <= 0) problems.push(`${where}: scale must be > 0`);
        if (layer.sway && layer.sway.speed < 0) problems.push(`${where}: sway speed can't be negative`);
      } else if (layer.kind === 'flash') {
        color(where, layer.color);
      } else if (layer.kind === 'vignette' && layer.color) {
        color(where, layer.color);
      }
    });
  }

  if (!LIGHTING.flat) problems.push('lighting: "flat" is the default mood and must exist');
  for (const [id, mood] of Object.entries(LIGHTING)) {
    color(`mood "${id}" ambient`, mood.ambient);
  }

  if (problems.length > 0) throw new Error(`FX data has problems:\n- ${problems.join('\n- ')}`);
}
