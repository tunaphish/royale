import * as React from 'react';

import type { MarkupNode } from './markup';
import textStyles from './textStyles.module.css';
import { Frenzy } from './effects/Frenzy';
import type { Letter, PerLetterEffectProps, WrapEffectProps } from './effects/letters';

type TagDefinition =
  | { perLetter?: false; component: React.ComponentType<WrapEffectProps> }
  | { perLetter: true; component: React.ComponentType<PerLetterEffectProps> };

const Span = ({ children, className }: WrapEffectProps) => <span className={className}>{children}</span>;
const Bold = ({ children, className }: WrapEffectProps) => <b className={className}>{children}</b>;
const Italic = ({ children, className }: WrapEffectProps) => <i className={className}>{children}</i>;

/**
 * Tags a script line can use. To add an effect, write a component and add it
 * here: `perLetter: true` hands it each letter instead of its children.
 */
const TAGS: Record<string, TagDefinition> = {
  span: { component: Span },
  b: { component: Bold },
  i: { component: Italic },
  frenzy: { perLetter: true, component: Frenzy },
};

const HIDDEN: React.CSSProperties = { visibility: 'hidden' };

/** Warns once per message, since RichText re-renders on every typed letter. */
const warned = new Set<string>();
const warnOnce = (message: string) => {
  if (warned.has(message)) return;
  warned.add(message);
  console.warn(`[RichText] ${message}`);
};

/** Resolves `class="red big"` against textStyles.module.css. */
const resolveClasses = (classes: string[]): string | undefined => {
  const styles = textStyles as Record<string, string>;
  const resolved = classes.flatMap((name) => {
    if (styles[name]) return [styles[name]];
    warnOnce(`unknown class "${name}"; add it to scenes/ui/textStyles.module.css`);
    return [];
  });
  return resolved.length > 0 ? resolved.join(' ') : undefined;
};

/** How many more letters may show. Shared while walking the tree, in reading order. */
type Budget = { left: number };

const takeVisible = (text: string, budget: Budget): number => {
  const visible = Math.max(0, Math.min(text.length, budget.left));
  budget.left -= text.length;
  return visible;
};

/** Flattens an effect's contents into letters, keeping nested span classes. */
const collectLetters = (nodes: MarkupNode[], budget: Budget, inherited: string[], letters: Letter[]): void => {
  nodes.forEach((node) => {
    if (node.kind === 'text') {
      const visible = takeVisible(node.text, budget);
      const className = resolveClasses(inherited);
      [...node.text].forEach((char, i) => {
        letters.push({ char, index: letters.length, visible: i < visible, className });
      });
      return;
    }
    if (TAGS[node.tag]?.perLetter) {
      warnOnce(`<${node.tag}> inside another per-letter effect is ignored; the outer effect owns the letters`);
    } else if (node.tag !== 'span') {
      warnOnce(`<${node.tag}> inside a per-letter effect is ignored; use <span class="..."> for styling`);
    }
    collectLetters(node.children, budget, [...inherited, ...node.classes], letters);
  });
};

const renderNodes = (nodes: MarkupNode[], budget: Budget, keyPrefix: string): React.ReactNode[] =>
  nodes.map((node, i) => {
    const key = `${keyPrefix}${i}`;

    if (node.kind === 'text') {
      const visible = takeVisible(node.text, budget);
      return (
        <React.Fragment key={key}>
          {node.text.slice(0, visible)}
          {visible < node.text.length && <span style={HIDDEN}>{node.text.slice(visible)}</span>}
        </React.Fragment>
      );
    }

    const definition = TAGS[node.tag];
    const className = resolveClasses(node.classes);

    if (!definition) {
      warnOnce(`unknown tag <${node.tag}>; add it to TAGS in scenes/ui/RichText.tsx`);
      return <span key={key} className={className}>{renderNodes(node.children, budget, `${key}.`)}</span>;
    }

    if (definition.perLetter) {
      const letters: Letter[] = [];
      collectLetters(node.children, budget, [], letters);
      const Effect = definition.component;
      return <Effect key={key} letters={letters} className={className} />;
    }

    const Effect = definition.component;
    return <Effect key={key} className={className}>{renderNodes(node.children, budget, `${key}.`)}</Effect>;
  });

/**
 * Renders parsed markup. With `revealed`, only that many letters show; the
 * rest are hidden but keep their space, so words don't move while typing.
 */
export const RichText = ({ nodes, revealed = Infinity }: { nodes: MarkupNode[]; revealed?: number }): JSX.Element => (
  <span className={textStyles.richText}>{renderNodes(nodes, { left: revealed }, '')}</span>
);
