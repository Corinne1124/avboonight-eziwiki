import GithubSlugger from 'github-slugger';
import { toString as mdastToString } from 'mdast-util-to-string';
import { visit } from 'unist-util-visit';
import type { Heading, Root, RootContent, Text } from 'mdast';
import { WIKILINK_PATTERN, parseWikiLink } from './wikilink';
import { resolveTarget } from '../content/resolver';

/**
 * Heading ids computed from the source, as the render will assign them.
 *
 * rehype-slug ids the rendered heading, so `## See [[quick-start|Alias]]`
 * is "See Alias" and gets `see-alias`, and inline HTML contributes nothing.
 * Slugging the raw source gave `see-quick-startalias` for the same heading,
 * and a section include naming the id the page itself advertises found
 * nothing. Anything that has to know a heading's id before the page is
 * rendered — section includes, the link check — reads it from here.
 *
 * Server-only: a wiki link with no label shows the title of the page it
 * resolves to, which takes the resolver.
 */

/** A heading's position, level and the id it will render with. */
export interface HeadingSlug {
  /** Index of the heading among the document's top-level nodes */
  index: number;
  /** Heading level, 1–6 */
  depth: number;
  /** The id, numbered for repeats as rehype-slug numbers them */
  slug: string;
}

/**
 * The text a heading renders with, before slugging.
 *
 * @param node - The heading
 * @returns Its visible text
 */
export function headingText(node: Heading): string {
  const clone: Root = { type: 'root', children: [structuredClone(node)] };

  visit(clone, 'html', (_html, index, parent) => {
    if (parent && index !== undefined) parent.children.splice(index, 1);
    return index;
  });

  visit(clone, 'text', (text: Text) => {
    text.value = text.value.replace(WIKILINK_PATTERN, (raw, embed: string, inner: string) => {
      const link = parseWikiLink(inner, raw, embed === '!');
      if (!link) return raw;
      if (link.label) return link.label;
      if (!link.target) return link.anchor ?? raw;

      return resolveTarget(link.target).doc?.title ?? link.target;
    });
  });

  return mdastToString(clone);
}

/**
 * Ids of every heading in a document, in order.
 *
 * @param nodes - The document's top-level nodes
 * @returns One entry per heading
 */
export function headingSlugs(nodes: RootContent[]): HeadingSlug[] {
  const slugger = new GithubSlugger();
  const slugs: HeadingSlug[] = [];

  nodes.forEach((node, index) => {
    if (node.type !== 'heading') return;
    slugs.push({ index, depth: node.depth, slug: slugger.slug(headingText(node)) });
  });

  return slugs;
}
