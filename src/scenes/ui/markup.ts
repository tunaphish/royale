/**
 * Parses the small HTML-like markup allowed in ink lines, e.g.
 * `It changed <frenzy>everything</frenzy>, <span class="red">me</span>.`
 *
 * This only reads the syntax. Which tags and classes exist is decided by
 * whoever renders the tree (RichText), so this stays plain and testable.
 */

export type MarkupNode =
  | { kind: 'text'; text: string }
  | { kind: 'element'; tag: string; classes: string[]; children: MarkupNode[] };

type OpenElement = Extract<MarkupNode, { kind: 'element' }>;

/** `<tag attr="value" ...>` or `</tag>`. Anything else with `<` is plain text. */
const TAG_PATTERN = /<(\/?)([a-zA-Z][\w-]*)((?:\s+[\w-]+(?:="[^"]*")?)*)\s*>/g;
const ATTRIBUTE_PATTERN = /([\w-]+)(?:="([^"]*)")?/g;

/**
 * Builds the markup tree. Problems never throw; they're reported in `problems`
 * and the text is kept:
 * - an unclosed tag is closed at the end of the line
 * - a closing tag with no matching opening tag is kept as plain text
 * - attributes other than `class` are ignored
 * Tag names are lowercased, so `<Frenzy>` and `<frenzy>` are the same.
 */
export const parseMarkup = (source: string): { nodes: MarkupNode[]; problems: string[] } => {
  const root: OpenElement = { kind: 'element', tag: '', classes: [], children: [] };
  const stack: OpenElement[] = [root];
  const problems: string[] = [];

  const current = () => stack[stack.length - 1];
  const addText = (text: string) => {
    if (!text) return;
    const siblings = current().children;
    const last = siblings[siblings.length - 1];
    if (last?.kind === 'text') {
      last.text += text;
    } else {
      siblings.push({ kind: 'text', text });
    }
  };

  let cursor = 0;
  for (const match of source.matchAll(TAG_PATTERN)) {
    const [whole, slash, rawTag, rawAttributes] = match;
    const tag = rawTag.toLowerCase();
    addText(source.slice(cursor, match.index));
    cursor = (match.index ?? 0) + whole.length;

    if (slash) {
      const openIndex = stack.map((element) => element.tag).lastIndexOf(tag);
      if (openIndex <= 0) {
        problems.push(`</${tag}> has no matching <${tag}>`);
        addText(whole);
        continue;
      }
      stack.slice(openIndex + 1).forEach((element) => problems.push(`<${element.tag}> isn't closed before </${tag}>`));
      stack.length = openIndex;
      continue;
    }

    const element: OpenElement = { kind: 'element', tag, classes: [], children: [] };
    for (const [, name, value] of rawAttributes.matchAll(ATTRIBUTE_PATTERN)) {
      if (name === 'class') {
        element.classes = (value ?? '').split(/\s+/).filter(Boolean);
      } else {
        problems.push(`<${tag}> attribute "${name}" isn't supported; only class is`);
      }
    }
    current().children.push(element);
    stack.push(element);
  }
  addText(source.slice(cursor));

  stack.slice(1).forEach((element) => problems.push(`<${element.tag}> isn't closed`));
  return { nodes: root.children, problems };
};

/** The visible text of a tree, without tags. Its length is what a typewriter reveals. */
export const plainText = (nodes: MarkupNode[]): string =>
  nodes.map((node) => (node.kind === 'text' ? node.text : plainText(node.children))).join('');
