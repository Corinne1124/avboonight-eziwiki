import { unified, type Processor } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeKatex from 'rehype-katex';
import rehypeShiki from '@shikijs/rehype';
import rehypeStringify from 'rehype-stringify';
import {
  rehypeBasePath,
  rehypeCodeShell,
  rehypeCollectHeadings,
  rehypeImages,
  rehypeInternalLinks,
  type Heading,
} from './rehype-plugins';
import { remarkWikiLinks, type WikiLinkTarget } from './remark-wikilink';
import { getUsedLanguages } from './languages';
import { cached } from '../cache';
import { BASE_PATH } from '../basePath';
import { getUrlMap } from '../navigation/urlMap';
import { getDoc } from '../content/registry';
import { resolveTarget } from '../content/resolver';
import { resolveAsset } from '../content/assets';
import { docPathToUrl } from '../navigation/url';

/**
 * Build-time Markdown rendering.
 *
 * Markdown is compiled to HTML once, during the build, instead of being parsed
 * in the browser on every page view. The browser receives finished markup, so
 * neither the Markdown parser nor the syntax highlighter ships to the client.
 *
 * Server-only: this module reads the content registry and the URL map.
 */

/** A rendered document: finished markup plus everything derived along the way. */
export interface RenderedMarkdown {
  /** Serialised HTML, ready for `dangerouslySetInnerHTML` */
  html: string;
  /** Headings collected for the table of contents */
  headings: Heading[];
}

/**
 * Syntax highlighting themes, applied as CSS variables for light and dark.
 *
 * The high-contrast variants, because the plain ones are tuned for GitHub's
 * near-white code background: against the slightly darker grey used here their
 * strings, keywords and comments land between 4.15:1 and 4.37:1, under the
 * 4.5:1 that body-sized text needs. Lightening the background would fix the
 * ratios too, but a code block that matches the page around it stops reading
 * as a code block.
 */
const SHIKI_THEMES = {
  light: 'github-light-high-contrast',
  dark: 'github-dark-high-contrast',
} as const;

let processor: Processor | null = null;

/**
 * Resolves a wiki-link target to a destination in this site.
 *
 * The trailing slash is applied here rather than downstream. Under the `path`
 * strategy `rehypeInternalLinks` sees a content path it can resolve and adds
 * one, but under `hash` the URL is already a digest, which does not map back
 * to a document — so the link was left without it and every wiki link cost a
 * redirect.
 *
 * @param target - Raw target text from inside the brackets
 * @returns The destination, or null when the target does not resolve
 */
function resolveWikiLink(target: string): WikiLinkTarget | null {
  const { doc } = resolveTarget(target);
  if (!doc) return null;

  const url = docPathToUrl(getUrlMap(), doc.path);
  return url ? { url: `/${url}/`, title: doc.title } : null;
}

/**
 * Resolves an embed target to a file under `public/`.
 *
 * @param target - Raw target text from inside the brackets
 * @returns The file's URL, or null when nothing matches
 */
function resolveWikiEmbed(target: string): { url: string } | null {
  const asset = resolveAsset(target);
  return asset ? { url: asset.url } : null;
}

/**
 * Builds the shared unified processor.
 *
 * Plugin order is load-bearing:
 * - `remarkWikiLinks` must run while the tree is still Markdown, so the links
 *   it produces are processed like any other link downstream.
 * - `rehype-raw` must follow `remark-rehype` with `allowDangerousHtml`, so that
 *   inline HTML in Markdown is parsed rather than escaped.
 * - `rehype-slug` must precede heading collection, which reads the ids it adds.
 * - `rehypeCodeShell` must precede the highlighter, since it reads the
 *   `language-*` class that highlighting replaces.
 * - `rehypeBasePath` runs last among the link plugins, so it prefixes the
 *   already-resolved internal hrefs rather than the authored ones.
 */
function createProcessor(): Processor {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkWikiLinks, { link: resolveWikiLink, embed: resolveWikiEmbed })
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSlug)
    .use(rehypeCollectHeadings)
    .use(rehypeKatex)
    .use(rehypeInternalLinks, getUrlMap())
    .use(rehypeImages)
    .use(rehypeCodeShell)
    .use(rehypeShiki, {
      themes: SHIKI_THEMES,
      defaultColor: false,
      cssVariablePrefix: '--shiki-',
      fallbackLanguage: 'text',
      // Without this Shiki loads every bundled grammar, which costs tens of
      // seconds before the first page renders.
      langs: getUsedLanguages(),
    })
    .use(rehypeBasePath, BASE_PATH)
    .use(rehypeStringify, { allowDangerousHtml: true }) as unknown as Processor;
}

/** Language set the current processor was built with. */
let processorLangs = '';

/**
 * Returns the shared processor, creating it on first use.
 *
 * Shiki loads its grammars and themes when the plugin is first applied; a
 * per-page processor would repeat that work for every document in the site.
 *
 * The grammar list is fixed when the processor is constructed, so it is
 * rebuilt if the set of languages the content uses changes — otherwise adding
 * a code block in a new language during `next dev` would render unhighlighted
 * until the server was restarted.
 */
function getProcessor(): Processor {
  const langs = getUsedLanguages().join(',');

  if (!processor || langs !== processorLangs) {
    processor = createProcessor();
    processorLangs = langs;
  }

  return processor;
}

/**
 * Compiles a Markdown string to HTML and extracts its headings.
 *
 * @param markdown - Markdown source, with frontmatter already stripped
 * @returns The rendered HTML and the headings found in it
 *
 * @example
 * ```typescript
 * const { html, headings } = await renderMarkdown('## Setup\n\nRun `npm i`.');
 * headings; // [{ id: 'setup', text: 'Setup', depth: 2 }]
 * ```
 */
export async function renderMarkdown(markdown: string): Promise<RenderedMarkdown> {
  const file = await getProcessor().process(markdown);

  return {
    html: String(file),
    headings: (file.data.headings as Heading[] | undefined) ?? [],
  };
}

const cache = new Map<string, RenderedMarkdown>();

/**
 * Renders a document from the content registry, memoised by path.
 *
 * A page's metadata, its body, and its table of contents are produced by
 * separate calls in the Next.js render lifecycle; caching keeps a document from
 * being compiled several times per build.
 *
 * @param docPath - Content-relative path without extension
 * @returns The rendered document, or null if no such document exists
 */
export async function renderDoc(docPath: string): Promise<RenderedMarkdown | null> {
  const hit = cached(cache.get(docPath) ?? null);
  if (hit) return hit;

  const doc = getDoc(docPath);
  if (!doc) return null;

  const rendered = await renderMarkdown(doc.content);
  cache.set(docPath, rendered);

  return rendered;
}
