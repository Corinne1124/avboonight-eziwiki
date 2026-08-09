import { getSite } from '../site';
import { getDoc } from './registry';
import { getReadingOrder } from '../navigation/sequence';
import { getExcerpt } from './excerpt';
import { docPathToUrl } from '../navigation/url';
import { pageUrl } from '../basePath';
import { cached, contentGeneration, stamp } from '../cache';

/**
 * The wiki, written out for something that reads rather than crawls.
 *
 * An answer engine arriving at a page gets the page: navigation it cannot use,
 * a contents rail, a search box, and the article somewhere inside. It has to
 * infer from markup what the site is and which pages matter, and it usually
 * infers wrong — the sidebar is thirty links and the article is one.
 *
 * `llms.txt` states it instead. One Markdown file at a known address, giving
 * the wiki's name, what it is, and every page with a sentence about it, in the
 * order a reader would meet them. The convention is small on purpose: it is
 * read, not parsed, and anything that can read a page can read this.
 *
 * Server-only.
 */

/** Where the file is served from, by convention. */
export const LLMS_PATH = '/llms.txt';

/**
 * Trims a summary to one line.
 *
 * The excerpt is drawn from the opening prose, which may run to a paragraph.
 * A listing wants a sentence, and the first one is nearly always the one that
 * says what the page is.
 *
 * @param text - Excerpt text
 * @returns A single sentence, or an empty string
 *
 * @example
 * ```typescript
 * oneLine('Get going in 5 minutes. Then read on.'); // 'Get going in 5 minutes.'
 * ```
 */
export function oneLine(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (!flat) return '';

  // A full stop that ends a sentence rather than one inside `node.js` or
  // `1.2`, which is what the lookahead rules out.
  //
  // Letters are matched by property rather than by `a-z`: a Korean or Japanese
  // description ends its sentences in characters no Latin range contains, and
  // with an ASCII class the search simply never matched, so every entry in
  // such a wiki carried a whole paragraph. `。` needs no space after it —
  // that is the point of having its own character — so it terminates on its
  // own.
  const end = flat.search(/(?<=[\p{L}\p{N})”'"])(?:\.(?=\s|$)|。)/u);
  const sentence = end === -1 ? flat : flat.slice(0, end + 1);

  return sentence.length > 200 ? `${sentence.slice(0, 197).trimEnd()}…` : sentence;
}

let memo: string | null = null;
const memoStamp = stamp();

/**
 * Renders `llms.txt` for this wiki.
 *
 * Pages appear in reading order, which is the sidebar flattened, so the file
 * describes the wiki the way its author arranged it rather than the way the
 * filesystem happens to sort. Hidden pages are left out for the same reason
 * they are left out of the sitemap: they are unlisted deliberately.
 *
 * @returns The complete file
 *
 * @example
 * ```markdown
 * # eziwiki
 *
 * > A wiki and documentation site generator.
 *
 * ## Pages
 *
 * - [Quick Start](https://example.com/getting-started/quick-start/): Build your first wiki.
 * ```
 */
export function renderLlmsTxt(): string {
  const hit = cached(memo, memoStamp);
  if (hit) return hit;

  const { global, urlMap, hiddenPaths } = getSite();

  const lines = [`# ${global.title}`, '', `> ${global.description}`, '', '## Pages', ''];

  for (const path of getReadingOrder()) {
    if (hiddenPaths.has(path)) continue;

    const doc = getDoc(path);
    const url = docPathToUrl(urlMap, path);
    if (!doc || !url) continue;

    // The author's own description first: it was written to say what the page
    // is, which is exactly what this file is for. The excerpt is the fallback.
    const summary = oneLine(doc.description || getExcerpt(path));
    const href = pageUrl(url, global.baseUrl);

    lines.push(summary ? `- [${doc.title}](${href}): ${summary}` : `- [${doc.title}](${href})`);
  }

  lines.push('');
  memo = lines.join('\n');
  memoStamp.at = contentGeneration();

  return memo;
}
