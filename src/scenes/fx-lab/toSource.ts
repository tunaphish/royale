const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/** Writes a value as a TypeScript literal in the style of `data/fx.ts`. */
export function toSource(value: unknown, indent = ''): string {
  const inner = `${indent}  `;
  if (value === null || value === undefined) return String(value);
  if (typeof value === 'string') return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  if (typeof value === 'number') return String(Math.round(value * 1000) / 1000);
  if (typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    // short arrays of plain values stay on one line: [min, max], colors
    if (value.every((v) => typeof v !== 'object' || v === null)) return `[${value.map((v) => toSource(v)).join(', ')}]`;
    return `[\n${value.map((v) => `${inner}${toSource(v, inner)},`).join('\n')}\n${indent}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined);
  const flat = entries.every(([, v]) => typeof v !== 'object' || v === null || (Array.isArray(v) && v.every((x) => typeof x !== 'object')));
  const key = (k: string) => (IDENTIFIER.test(k) ? k : `'${k}'`);
  if (flat && entries.length <= 4) return `{ ${entries.map(([k, v]) => `${key(k)}: ${toSource(v)}`).join(', ')} }`;
  return `{\n${entries.map(([k, v]) => `${inner}${key(k)}: ${toSource(v, inner)},`).join('\n')}\n${indent}}`;
}

/** An FX entry ready to paste into `FX` in `data/fx.ts`. */
export const fxEntrySource = (id: string, def: unknown): string =>
  `  ${IDENTIFIER.test(id) ? id : `'${id}'`}: ${toSource(def, '  ')},`;
