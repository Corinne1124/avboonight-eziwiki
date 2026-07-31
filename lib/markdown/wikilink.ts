/**
 * Parsing for `[[wiki link]]` syntax.
 *
 * Kept free of any filesystem or registry access so it can be unit-tested and
 * reused by both the renderer and the link-graph scanner.
 */

/**
 * Matches a wiki link and captures its contents.
 *
 * Deliberately refuses `]` and newlines inside the brackets: an unterminated
 * `[[` should stay literal text rather than swallowing the rest of a paragraph.
 */
export const WIKILINK_PATTERN = /\[\[([^\]\n]+)\]\]/g;

/** The parts of a wiki link. */
export interface WikiLink {
  /** Document being linked to, before the anchor */
  target: string;
  /** In-page anchor, without the leading '#' */
  anchor?: string;
  /** Display text, when the author supplied one after '|' */
  label?: string;
  /** The full matched source, e.g. '[[guide#setup|Setup]]' */
  raw: string;
}

/**
 * Parses the inside of a wiki link.
 *
 * Supported forms:
 * - `[[target]]`
 * - `[[target|label]]`
 * - `[[target#anchor]]`
 * - `[[target#anchor|label]]`
 *
 * The label is split off first, so a `|` inside it is preserved and a `#` in
 * the label is not mistaken for an anchor.
 *
 * @param inner - Text between the brackets
 * @param raw - The full matched source, stored on the result
 * @returns The parsed link, or null when the target is empty
 *
 * @example
 * ```typescript
 * parseWikiLink('guides/setup#step-1|Step one', '[[guides/setup#step-1|Step one]]');
 * // { target: 'guides/setup', anchor: 'step-1', label: 'Step one', raw: '...' }
 * ```
 */
export function parseWikiLink(inner: string, raw: string): WikiLink | null {
  const pipe = inner.indexOf('|');
  const label = pipe === -1 ? undefined : inner.slice(pipe + 1).trim();
  const locator = (pipe === -1 ? inner : inner.slice(0, pipe)).trim();

  const hash = locator.indexOf('#');
  const target = (hash === -1 ? locator : locator.slice(0, hash)).trim();
  const anchor = hash === -1 ? undefined : locator.slice(hash + 1).trim() || undefined;

  // An anchor-only link such as [[#section]] refers within the current page.
  if (!target && !anchor) return null;

  return {
    target,
    anchor,
    label: label || undefined,
    raw,
  };
}

/**
 * Finds every wiki link in a string.
 *
 * @param text - Text to scan
 * @returns Parsed links, in order of appearance
 */
export function findWikiLinks(text: string): WikiLink[] {
  const links: WikiLink[] = [];

  for (const match of text.matchAll(WIKILINK_PATTERN)) {
    const parsed = parseWikiLink(match[1], match[0]);
    if (parsed) links.push(parsed);
  }

  return links;
}
