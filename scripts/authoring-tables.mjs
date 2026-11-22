// Writes the mood and FX tables in the writers' guide from the doc comments in
// src/data/lighting.ts and src/data/fx.ts, so the guide can't fall behind the data.
//
//   npm run docs              rewrite the tables in src/assets/scripts/AUTHORING.md
//   npm run docs -- --check   only warn if they're out of date (the build runs this)
//
// Each table sits between markers in the guide; everything else is left alone:
//   <!-- generated: moods -->  ...  <!-- end generated -->
// Tables: `moods`, `lights` (FX made only of light layers), `effects` (every other FX).

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GUIDE = resolve(root, 'src/assets/scripts/AUTHORING.md');
const MOODS = resolve(root, 'src/data/lighting.ts');
const FX = resolve(root, 'src/data/fx.ts');

const check = process.argv.includes('--check');
const warnings = [];

/** The object literal assigned to `export const <name>` in a file. */
function exportedObject(file, name) {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  let found;
  source.forEachChild((node) => {
    if (!ts.isVariableStatement(node)) return;
    for (const declaration of node.declarationList.declarations) {
      if (declaration.name.getText(source) !== name) continue;
      let init = declaration.initializer;
      while (init && (ts.isSatisfiesExpression(init) || ts.isAsExpression(init))) init = init.expression;
      if (init && ts.isObjectLiteralExpression(init)) found = init;
    }
  });
  if (!found) throw new Error(`${file}: no "export const ${name} = { ... }"`);
  return { source, object: found };
}

/** The text of the doc comment right above a node, on one line. */
function docComment(source, node) {
  const ranges = ts.getLeadingCommentRanges(source.text, node.getFullStart()) ?? [];
  const doc = ranges.map((r) => source.text.slice(r.pos, r.end)).filter((c) => c.startsWith('/**')).pop();
  if (!doc) return null;
  return doc
    .replace(/^\/\*\*|\*\/$/g, '')
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, '').trim())
    .filter(Boolean)
    .join(' ');
}

const keyOf = (source, property) => {
  const name = property.name;
  return ts.isStringLiteral(name) ? name.text : name.getText(source);
};

const property = (object, name) =>
  object.properties.find((p) => ts.isPropertyAssignment(p) && p.name.getText().replace(/['"]/g, '') === name);

/** Each entry of a data object: its key, its description, and its value node. */
function entries(file, name) {
  const { source, object } = exportedObject(file, name);
  return object.properties.filter(ts.isPropertyAssignment).map((p) => {
    const key = keyOf(source, p);
    const description = docComment(source, p);
    if (!description) warnings.push(`${file.slice(root.length + 1)}: "${key}" has no doc comment; the guide shows a placeholder`);
    return { key, description: description ?? '(no description yet)', value: p.initializer };
  });
}

/** True for an FX whose layers are all `kind: 'light'`. */
function isLightOnly(value) {
  if (!ts.isObjectLiteralExpression(value)) return false;
  const layers = property(value, 'layers');
  if (!layers || !ts.isArrayLiteralExpression(layers.initializer)) return false;
  const kinds = layers.initializer.elements.map((layer) => {
    const kind = ts.isObjectLiteralExpression(layer) && property(layer, 'kind');
    return kind && ts.isStringLiteral(kind.initializer) ? kind.initializer.text : null;
  });
  return kinds.length > 0 && kinds.every((kind) => kind === 'light');
}

const cell = (text) => text.replace(/\|/g, '\\|');
const table = (heading, rows) =>
  [`| ${heading[0]} | ${heading[1]} |`, '| --- | --- |', ...rows.map(({ key, description }) => `| \`${key}\` | ${cell(description)} |`)].join('\n');

const moods = entries(MOODS, 'LIGHTING');
const fx = entries(FX, 'FX');
const tables = {
  moods: table(['Mood', 'Use it for'], moods),
  lights: table(['Effect', 'What it is'], fx.filter((e) => isLightOnly(e.value))),
  effects: table(['Effect', 'What it is'], fx.filter((e) => !isLightOnly(e.value))),
};

const guide = readFileSync(GUIDE, 'utf8');
let updated = guide;
for (const [name, body] of Object.entries(tables)) {
  const pattern = new RegExp(`(<!-- generated: ${name} -->\\n)[\\s\\S]*?(\\n<!-- end generated -->)`);
  if (!pattern.test(updated)) {
    warnings.push(`AUTHORING.md: no "<!-- generated: ${name} -->" ... "<!-- end generated -->" markers`);
    continue;
  }
  updated = updated.replace(pattern, `$1${body}$2`);
}

warnings.forEach((w) => console.warn(`[docs] ${w}`));
if (updated === guide) {
  console.log('[docs] the writers\' guide tables are up to date');
} else if (check) {
  // A warning, not a failure: a forgotten regenerate shouldn't block a deploy.
  console.warn('[docs] the writers\' guide tables are out of date with src/data; run `npm run docs`');
} else {
  writeFileSync(GUIDE, updated);
  console.log('[docs] updated the mood and FX tables in src/assets/scripts/AUTHORING.md');
}
