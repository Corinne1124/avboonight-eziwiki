import { visit } from 'unist-util-visit';
import type { Root, Text, PhrasingContent, Parent } from 'mdast';

/**
 * Turns `||spoiler text||` into click-to-reveal inline spoilers.
 *
 * Discord-style spoilers are plain text between two pairs of pipes. A spoiler
 * becomes a label wrapping an invisible checkbox and the text itself, so the
 * reveal is the browser's own disclosure: clicking the pill toggles the box,
 * and CSS shows or hides the text off that state. No script is shipped, no
 * state has to be remembered, and the text stays in the document — indexed by
 * search, selectable once revealed, and absent from the accessibility tree
 * (via `visibility`) while it is hidden.
 *
 * The content between the pipes is re-emitted as plain text under the span, so
 * syntax the pipeline understands — a `[[wiki link]]`, say — is still resolved
 * by the passes that run afterwards. Only a spoiler inside a single text run
 * is recognised: one split across inline markdown (`||see *this*||`) stays as
 * written, which is the same boundary the wiki-link syntax observes.
 */

/** Matches one `||…||` pair inside a text node, non-empty and non-greedy. */
const SPOILER_PATTERN = /\|\|([\s\S]+?)\|\|/g;

/**
 * Builds the node a spoiler becomes.
 *
 * `emphasis` is the carrier, the way the wiki-link pass uses it: a known
 * phrasing type, renamed on the way out, so it degrades to `<em>` if the
 * `hName` hint were ever ignored. The checkbox comes first so the CSS
 * sibling selector can key off `:checked`; the inner text sits in its own
 * span so that hiding and showing it is one rule.
 *
 * @param inner - Text between the pipes
 * @returns The spoiler node
 */
function spoilerNode(inner: string): PhrasingContent {
  return {
    type: 'emphasis',
    data: {
      hName: 'label',
      hProperties: {
        className: ['ezw-spoiler'],
        title: '剧透内容：点击展开或收起',
      },
    },
    children: [
      {
        type: 'html',
        value:
          '<input type="checkbox" class="ezw-spoiler__toggle" aria-label="剧透内容（点击展开或收起）" />',
      },
      {
        type: 'emphasis',
        data: { hName: 'span', hProperties: { className: ['ezw-spoiler__text'] } },
        children: [{ type: 'text', value: inner }],
      },
    ],
  };
}

/**
 * Remark plugin factory.
 *
 * Visits text nodes only, so `||…||` inside code spans, fenced blocks, links
 * or raw HTML is left exactly as it was written.
 *
 * @example
 * ```typescript
 * unified().use(remarkParse).use(remarkSpoilers);
 * // 那个人其实是||国王||。
 * ```
 */
export function remarkSpoilers() {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === undefined) return;
      if (!node.value.includes('||')) return;

      const pieces: PhrasingContent[] = [];
      let cursor = 0;
      let matched = false;

      for (const match of node.value.matchAll(SPOILER_PATTERN)) {
        const start = match.index ?? 0;

        if (start > cursor) {
          pieces.push({ type: 'text', value: node.value.slice(cursor, start) });
        }

        pieces.push(spoilerNode(match[1]));
        cursor = start + match[0].length;
        matched = true;
      }

      if (!matched) return;

      if (cursor < node.value.length) {
        pieces.push({ type: 'text', value: node.value.slice(cursor) });
      }

      (parent as Parent).children.splice(index, 1, ...pieces);

      // Continue after the nodes just inserted, so their text is not rescanned.
      return index + pieces.length;
    });
  };
}
