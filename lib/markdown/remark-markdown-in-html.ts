import { visit } from 'unist-util-visit';
import type { Root, Html } from 'mdast';

/**
 * Renders markdown written inside raw HTML.
 *
 * CommonMark keeps the content of an HTML block raw, so `**bold**` inside a
 * `<table>` cell or a `<div>` that hugs its tags stays literal. Authors
 * writing a wiki with styled scaffolding expect the small stuff to work
 * anyway: a `||spoiler||`, a `[[wiki link]]`, some emphasis, inline code.
 *
 * This pass re-scans the text between the tags of self-contained HTML blocks
 * (`<table>…</table>`, `<details>…</details>`, a `<div>` whose content is glued
 * to the tags) and runs each eligible run through an inline-Markdown renderer
 * provided by the caller. The rest of the markup — tags, attributes, comments —
 * is copied through untouched.
 *
 * Deliberately bounded:
 * - Only *inline* constructs are recognised; a run that parses as anything
 *   other than a single paragraph is left as written (so full blocks still
 *   need a blank line between the tags, which the main pipeline already
 *   handles).
 * - Text inside `script`, `style`, `pre`, `code`, `textarea`, `svg` and the
 *   other raw-text elements is never touched.
 */

/** Text the caller may render: what the inline syntaxes are made of. */
const HAS_MARKDOWN = /[*_~`|\[\]$]/;

/** Elements whose text content must stay literal, whatever it looks like. */
const RAW_TEXT = new Set([
  'script',
  'style',
  'pre',
  'code',
  'kbd',
  'samp',
  'tt',
  'xmp',
  'textarea',
  'title',
  'svg',
  'math',
  'noscript',
  'template',
  'iframe',
  'object',
  'embed',
]);

/** Void elements, which have no closing tag and no text content. */
const VOID = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

/** How the caller turns a text run into rendered inline HTML. */
export interface MarkdownInHtmlOptions {
  /** Renders one text run; null when the run is not single-paragraph prose */
  renderInline: (text: string) => Promise<string | null>;
}

/**
 * Finds the end of a tag that starts at `at`, honouring quoted attributes.
 *
 * @param value - The HTML string
 * @param at - Index of the `<`
 * @returns Index just past the tag, or -1 when it is unterminated
 */
function tagEnd(value: string, at: number): number {
  let quote: string | null = null;

  for (let i = at + 1; i < value.length; i++) {
    const char = value[i];

    if (quote) {
      if (char === quote) quote = null;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '>') {
      return i + 1;
    }
  }

  return -1;
}

/**
 * Rewrites the text runs of one HTML string.
 *
 * @param value - Raw HTML block content
 * @param render - Inline renderer, called for every eligible text run
 * @returns The value with eligible runs replaced by rendered HTML
 */
async function rewrite(
  value: string,
  render: (text: string) => Promise<string | null>,
): Promise<string> {
  // A comment, declaration or CDATA section runs to its own terminator and is
  // markup, not text; `<!` and `<?` both end at `>`.
  const comment = /^<!--[\s\S]*?-->/;

  const stack: string[] = [];
  const out: string[] = [];
  let cursor = 0;

  while (cursor < value.length) {
    const lt = value.indexOf('<', cursor);

    if (lt === -1) {
      out.push(await handleText(value.slice(cursor), stack, render));
      break;
    }

    // Text between the last tag and this one.
    if (lt > cursor) {
      out.push(await handleText(value.slice(cursor, lt), stack, render));
    }

    const rest = value.slice(lt);

    if (comment.test(rest)) {
      const end = rest.indexOf('-->') + 3;
      out.push(rest.slice(0, end));
      cursor = lt + end;
      continue;
    }

    const end = tagEnd(value, lt);
    if (end === -1) {
      // Unterminated: treat the rest as text rather than swallowing it.
      out.push(value.slice(cursor));
      break;
    }

    const tag = value.slice(lt, end);

    if (tag.startsWith('</')) {
      const name = /^<\/([a-zA-Z][a-zA-Z0-9-]*)/.exec(tag)?.[1];
      if (name) {
        // Pop to the matching opener, tolerating stray closes.
        const at = stack.lastIndexOf(name);
        if (at !== -1) stack.splice(at);
      }
    } else if (!/^<\/|^<![a-zA-Z]|^<\?/.test(tag) && !/\/>$/.test(tag.trim())) {
      const name = /^<([a-zA-Z][a-zA-Z0-9-]*)/.exec(tag)?.[1];
      if (name && !VOID.has(name.toLowerCase())) stack.push(name.toLowerCase());
    }

    out.push(tag);
    cursor = end;
  }

  return out.join('');
}

/**
 * Renders one text run, or returns it unchanged.
 *
 * @param text - Text between two tags
 * @param stack - Currently open element names
 * @param render - The caller's inline renderer
 * @returns The replacement text
 */
async function handleText(
  text: string,
  stack: string[],
  render: (text: string) => Promise<string | null>,
): Promise<string> {
  if (!text.trim()) return text;
  if (stack.some((name) => RAW_TEXT.has(name))) return text;
  if (!HAS_MARKDOWN.test(text)) return text;

  const rendered = await render(text);
  return rendered ?? text;
}

/**
 * Remark plugin factory.
 *
 * Runs on the Markdown AST, before conversion to HTML. Only self-contained
 * raw-HTML blocks — values carrying both an opening and a closing tag — are
 * touched, so a lone `<div>` left open for blank-line-separated content keeps
 * the behaviour the rest of the pipeline already gives it.
 *
 * @example
 * ```typescript
 * unified().use(remarkParse).use(remarkMarkdownInHtml, { renderInline });
 * ```
 */
export function remarkMarkdownInHtml(options: MarkdownInHtmlOptions) {
  const { renderInline } = options;

  return async (tree: Root) => {
    const jobs: Array<{ node: Html; value: string }> = [];

    visit(tree, 'html', (node: Html, index, parent) => {
      if (!parent || index === undefined) return;

      // Block positions only: an `html` node nested in a paragraph is inline
      // HTML, whose neighbours the parser already processes as Markdown.
      if (
        parent.type === 'paragraph' ||
        parent.type === 'heading' ||
        parent.type === 'emphasis' ||
        parent.type === 'strong' ||
        parent.type === 'delete' ||
        parent.type === 'link' ||
        parent.type === 'tableCell'
      ) {
        return;
      }

      const value = node.value;
      if (!value.includes('</') || !value.includes('<')) return;
      if (!HAS_MARKDOWN.test(value)) return;

      jobs.push({ node, value });
    });

    for (const job of jobs) {
      const rendered = await rewrite(job.value, renderInline);
      if (rendered !== job.value) job.node.value = rendered;
    }
  };
}
