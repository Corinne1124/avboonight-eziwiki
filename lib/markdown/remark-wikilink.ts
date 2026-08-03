import { visit } from 'unist-util-visit';
import type { Root, Text, PhrasingContent, Parent } from 'mdast';
import { WIKILINK_PATTERN, parseWikiLink, type WikiLink } from './wikilink';

/**
 * Turns `[[wiki links]]` into ordinary Markdown links.
 *
 * Runs on the Markdown AST, before conversion to HTML, so the resulting links
 * pass through the rest of the pipeline like any other. Only text nodes are
 * visited, which means links written inside code spans and fenced blocks are
 * left alone for free — documentation that explains the syntax has to be able
 * to show it.
 */

/** What a target resolved to. */
export interface WikiLinkTarget {
  /** Root-relative href for the document */
  url: string;
  /** Default display text when the author gave no label */
  title: string;
}

/**
 * Resolves a wiki-link target to a destination, or null when there is none.
 */
export type WikiLinkResolver = (target: string) => WikiLinkTarget | null;

/**
 * Resolves an embed target to a static file, or null when there is none.
 */
export type EmbedResolver = (target: string) => { url: string } | null;

/** How a wiki link should be turned into a node. */
export interface WikiLinkResolvers {
  /** Resolves a document target */
  link: WikiLinkResolver;
  /** Resolves an embeddable file; absent when embeds are not supported */
  embed?: EmbedResolver;
}

/**
 * Builds the replacement node for one wiki link.
 *
 * An unresolved link renders as marked-up text rather than an anchor: a link
 * that goes nowhere is worse than visibly broken text, because it looks
 * clickable and silently is not.
 */
function toNode(link: WikiLink, resolvers: WikiLinkResolvers): PhrasingContent {
  const resolve = resolvers.link;

  // `![[file.png]]` shows the file rather than linking to it. Only static
  // assets are embedded for now; `![[some-note]]` falls through to a link, so
  // an author who writes it gets a working reference instead of nothing.
  if (link.embed && resolvers.embed) {
    const asset = resolvers.embed(link.target);

    if (asset) {
      return {
        type: 'image',
        url: asset.url,
        alt: link.label ?? link.target,
      };
    }
  }

  // An anchor-only link points within the current page, so there is nothing to
  // resolve.
  if (!link.target && link.anchor) {
    return {
      type: 'link',
      url: `#${link.anchor}`,
      children: [{ type: 'text', value: link.label ?? link.anchor }],
    };
  }

  const resolved = resolve(link.target);

  if (!resolved) {
    return {
      // `emphasis` is a carrier for the rendered span: it is a known phrasing
      // type, so it degrades to <em> if the hName hint is ever ignored.
      type: 'emphasis',
      data: {
        hName: 'span',
        hProperties: {
          className: ['ezw-broken-link'],
          title: `Unresolved link: ${link.target}`,
        },
      },
      children: [{ type: 'text', value: link.label ?? link.target }],
    };
  }

  return {
    type: 'link',
    url: link.anchor ? `${resolved.url}#${link.anchor}` : resolved.url,
    data: {
      hProperties: { className: ['ezw-wikilink'] },
    },
    children: [{ type: 'text', value: link.label ?? resolved.title }],
  };
}

/**
 * Splits a text node into text and link nodes.
 *
 * @param node - The text node to split
 * @param resolvers - Target resolvers for links and embeds
 * @returns Replacement nodes, or null when the text contains no wiki links
 */
function splitText(node: Text, resolvers: WikiLinkResolvers): PhrasingContent[] | null {
  const { value } = node;
  if (!value.includes('[[')) return null;

  const replacement: PhrasingContent[] = [];
  let cursor = 0;
  let matched = false;

  // matchAll on a global pattern is safe here because the regex literal is
  // re-evaluated per call; lastIndex never leaks between documents.
  for (const match of value.matchAll(WIKILINK_PATTERN)) {
    const parsed = parseWikiLink(match[2], match[0], match[1] === '!');
    if (!parsed) continue;

    const start = match.index ?? 0;

    if (start > cursor) {
      replacement.push({ type: 'text', value: value.slice(cursor, start) });
    }

    replacement.push(toNode(parsed, resolvers));
    cursor = start + match[0].length;
    matched = true;
  }

  if (!matched) return null;

  if (cursor < value.length) {
    replacement.push({ type: 'text', value: value.slice(cursor) });
  }

  return replacement;
}

/**
 * Remark plugin factory.
 *
 * @param resolvers - Resolves a target to a document, and optionally to a file
 *
 * @example
 * ```typescript
 * unified().use(remarkParse).use(remarkWikiLinks, {
 *   link: (target) =>
 *     target === 'intro' ? { url: '/intro/', title: 'Introduction' } : null,
 *   embed: (target) => (target === 'logo.svg' ? { url: '/images/logo.svg' } : null),
 * });
 * ```
 */
export function remarkWikiLinks(resolvers: WikiLinkResolvers) {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === undefined) return;

      const replacement = splitText(node, resolvers);
      if (!replacement) return;

      (parent as Parent).children.splice(index, 1, ...replacement);

      // Continue after the nodes just inserted, so their text is not rescanned.
      return index + replacement.length;
    });
  };
}
