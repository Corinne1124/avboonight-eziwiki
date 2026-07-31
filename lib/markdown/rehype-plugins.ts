import { visit } from 'unist-util-visit';
import { toString } from 'hast-util-to-string';
import type { Element, Root } from 'hast';
import { docPathToUrl, type UrlMap } from '../navigation/url';

/**
 * Custom rehype plugins used by the build-time Markdown pipeline.
 *
 * These run against the HTML AST, after Markdown has been converted but before
 * it is serialised, which is the only place where heading anchors, resolved
 * links, and code-block chrome can all be produced without shipping a Markdown
 * parser to the browser.
 */

/** A heading extracted from a document, used to render the table of contents. */
export interface Heading {
  /** Anchor id, matching the `id` attribute rehype-slug assigned */
  id: string;
  /** Rendered text of the heading */
  text: string;
  /** Heading level, 1 for h1 through 6 for h6 */
  depth: number;
}

/** Heading levels collected for the table of contents. */
const TOC_LEVELS = new Set(['h2', 'h3', 'h4']);

/**
 * Collects document headings onto `file.data.headings`.
 *
 * Results are attached to the virtual file rather than to a closure so that a
 * single compiled processor can be reused across every document in the build —
 * instantiating the syntax highlighter per page is the dominant cost otherwise.
 *
 * Must run after `rehype-slug`, which assigns the `id` attributes the table of
 * contents links to. Headings without an id are skipped rather than given a
 * generated one, since an anchor absent from the document is a dead link.
 *
 * @example
 * ```typescript
 * const file = await unified().use(rehypeSlug).use(rehypeCollectHeadings).process(md);
 * const headings = file.data.headings as Heading[];
 * ```
 */
export function rehypeCollectHeadings() {
  return (tree: Root, file: { data: Record<string, unknown> }) => {
    const collected: Heading[] = [];

    visit(tree, 'element', (node: Element) => {
      if (!TOC_LEVELS.has(node.tagName)) return;

      const id = node.properties?.id;
      if (typeof id !== 'string' || !id) return;

      collected.push({
        id,
        text: toString(node),
        depth: Number(node.tagName.slice(1)),
      });
    });

    file.data.headings = collected;
  };
}

/**
 * Determines whether an href points outside the site.
 */
function isExternal(href: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//');
}

/**
 * Rewrites internal Markdown links to the site's configured URL form, and
 * hardens external links.
 *
 * Authors write links the way the content tree looks — `[Setup](guides/setup)`
 * — and this resolves them through the URL map, so the same Markdown works
 * under either URL strategy. Anchors, external URLs, and links to unknown
 * documents are left untouched.
 *
 * @param urlMap - Precomputed mapping from content paths to URL segments
 */
export function rehypeInternalLinks(urlMap: UrlMap) {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'a') return;

      const href = node.properties?.href;
      if (typeof href !== 'string' || !href) return;

      if (isExternal(href)) {
        node.properties.target = '_blank';
        // `rel` is a space-separated list property in hast, so it is modelled
        // as an array rather than a single string.
        node.properties.rel = ['noopener', 'noreferrer'];
        return;
      }

      // In-page anchors already point at ids produced by rehype-slug.
      if (href.startsWith('#')) return;

      // Split off any anchor or query so the document part can be resolved.
      const match = /^([^#?]*)(.*)$/.exec(href);
      if (!match) return;

      const [, rawPath, suffix] = match;
      const docPath = rawPath.replace(/^\/+/, '').replace(/\.md$/, '').replace(/\/+$/, '');
      if (!docPath) return;

      const url = docPathToUrl(urlMap, docPath);
      if (url) {
        node.properties.href = `/${url}${suffix}`;
      }
    });
  };
}

/**
 * Wraps fenced code blocks in a container with a language label and copy button.
 *
 * Runs *before* the syntax highlighter so that the language recorded in the
 * Markdown fence is still available; the highlighter then rewrites the inner
 * `<pre>` in place. The copy button carries no inline handler — a single
 * delegated listener on the client picks it up — which keeps the entire
 * highlighting stack out of the browser bundle.
 */
export function rehypeCodeShell() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName !== 'pre' || !parent || index === undefined) return;

      // Skip blocks that have already been wrapped.
      if (
        parent.type === 'element' &&
        (parent as Element).properties?.['data-ezw-code'] !== undefined
      ) {
        return;
      }

      const code = node.children.find(
        (child): child is Element => child.type === 'element' && child.tagName === 'code',
      );

      const className = code?.properties?.className;
      const classes = Array.isArray(className) ? className.map(String) : [];
      const languageClass = classes.find((cls) => cls.startsWith('language-'));
      const language = languageClass ? languageClass.slice('language-'.length) : 'text';

      const wrapper: Element = {
        type: 'element',
        tagName: 'div',
        properties: {
          className: ['ezw-code'],
          'data-ezw-code': '',
          'data-language': language,
        },
        children: [
          {
            type: 'element',
            tagName: 'div',
            properties: { className: ['ezw-code__bar'] },
            children: [
              {
                type: 'element',
                tagName: 'span',
                properties: { className: ['ezw-code__lang'] },
                children: [{ type: 'text', value: language }],
              },
              {
                type: 'element',
                tagName: 'button',
                properties: {
                  type: 'button',
                  className: ['ezw-code__copy'],
                  'data-ezw-copy': '',
                  'aria-label': 'Copy code',
                },
                children: [{ type: 'text', value: 'Copy' }],
              },
            ],
          },
          node,
        ],
      };

      parent.children[index] = wrapper;
    });
  };
}

/**
 * Prefixes root-relative asset URLs with the deployment base path.
 *
 * Static exports served from a subdirectory — GitHub Pages project sites, for
 * one — need `/images/x.png` rewritten to `/eziwiki/images/x.png`. Next rewrites
 * these for JSX it controls, but not for HTML produced by this pipeline.
 *
 * @param basePath - Deployment base path, or '' when served from the root
 */
export function rehypeBasePath(basePath: string) {
  return (tree: Root) => {
    if (!basePath) return;

    visit(tree, 'element', (node: Element) => {
      const attr = node.tagName === 'a' ? 'href' : node.tagName === 'img' ? 'src' : null;
      if (!attr) return;

      const value = node.properties?.[attr];
      if (typeof value !== 'string') return;
      if (!value.startsWith('/') || value.startsWith('//')) return;
      if (value.startsWith(`${basePath}/`)) return;

      node.properties[attr] = `${basePath}${value}`;
    });
  };
}

/**
 * Adds lazy loading and consistent styling hooks to content images.
 */
export function rehypeImages() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'img') return;

      node.properties ??= {};
      node.properties.loading ??= 'lazy';
      node.properties.decoding ??= 'async';

      const className = node.properties.className;
      const classes = Array.isArray(className) ? className.map(String) : [];
      node.properties.className = [...classes, 'ezw-img'];
    });
  };
}
