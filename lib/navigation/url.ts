/**
 * URL strategy determining how content paths appear in the address bar.
 *
 * - `path` — readable, SEO-friendly URLs mirroring the content tree
 *   (`/guides/quick-start`)
 * - `hash` — opaque, deterministic hashes that conceal the content structure
 *   (`/a3f2e9d1-4b8c7e6f-9d2a1b3c`)
 */
export type UrlStrategy = 'path' | 'hash';

/** Strategy applied when the payload does not specify one. */
export const DEFAULT_URL_STRATEGY: UrlStrategy = 'path';

/**
 * A precomputed, bidirectional mapping between content paths and URL segments.
 *
 * The map is built once on the server and handed to client components as plain
 * data. Keeping it serialisable is deliberate: it means the browser never needs
 * the hashing implementation, only the results.
 */
export interface UrlMap {
  /** Strategy this map was built with */
  strategy: UrlStrategy;
  /** Content path to URL segment (e.g. 'guides/quick-start' -> 'a3f2e9d1-...') */
  toUrl: Record<string, string>;
  /** URL segment back to content path */
  toPath: Record<string, string>;
}

/** An empty map, used as a safe default before hydration. */
export const EMPTY_URL_MAP: UrlMap = {
  strategy: DEFAULT_URL_STRATEGY,
  toUrl: {},
  toPath: {},
};

/**
 * The map in the form that crosses to the browser.
 *
 * A {@link UrlMap} is two lookup tables holding the same names twice. Under the
 * `path` strategy they are literally the same key on both sides; under `hash`
 * one side holds a digest per document. Sent as it stands, every page carried
 * both copies — on this wiki about thirteen kilobytes of the navigation
 * payload, on every page and again on every client-side navigation.
 *
 * A list of pairs says the same thing once. The browser rebuilds whichever
 * direction it needs, and neither direction is derivable per lookup: it is the
 * listing itself that is the information.
 */
export interface PackedUrlMap {
  /** Strategy the map was built with */
  strategy: UrlStrategy;
  /**
   * One entry per document, as `[contentPath, urlSegment]`.
   *
   * Pairs rather than two parallel arrays because the two are written together
   * and read together, and a pair cannot fall out of step with itself.
   */
  entries: Array<[docPath: string, url: string]>;
}

/**
 * Narrows a built map to what the browser has to be told.
 *
 * @param map - The full mapping, as built on the server
 * @returns The same information in its smallest form
 *
 * @example
 * ```typescript
 * packUrlMap(getUrlMap());
 * // { strategy: 'path', entries: [['intro', 'intro'], …] }
 * ```
 */
export function packUrlMap(map: UrlMap): PackedUrlMap {
  return {
    strategy: map.strategy,
    entries: Object.entries(map.toUrl) as Array<[string, string]>,
  };
}

/**
 * Rebuilds the lookup tables from the packed form.
 *
 * The inverse of {@link packUrlMap}, and where both directions come from: the
 * pairs are the only statement about how paths and segments correspond.
 *
 * @param packed - The map as it crossed the boundary
 * @returns A map the helpers in this module can use
 */
export function unpackUrlMap(packed: PackedUrlMap): UrlMap {
  const toUrl: Record<string, string> = {};
  const toPath: Record<string, string> = {};

  for (const [docPath, url] of packed.entries) {
    toUrl[docPath] = url;
    toPath[url] = docPath;
  }

  return { strategy: packed.strategy, toUrl, toPath };
}

/**
 * Strips leading and trailing slashes from a URL fragment.
 *
 * Route params arrive in several shapes depending on `trailingSlash` and on
 * whether the value came from `usePathname` or from a slug array; normalising
 * here keeps every caller from repeating the same trimming.
 *
 * @param value - Raw path or slug fragment
 * @returns The fragment without surrounding slashes
 *
 * @example
 * ```typescript
 * normalizeSlug('/guides/quick-start/'); // 'guides/quick-start'
 * normalizeSlug('guides/quick-start'); // 'guides/quick-start'
 * ```
 */
export function normalizeSlug(value: string): string {
  return value.normalize('NFC').replace(/^\/+/, '').replace(/\/+$/, '');
}

/**
 * Resolves a content path to its URL segment.
 *
 * @param map - Precomputed URL mapping
 * @param docPath - Content-relative path without extension
 * @returns The URL segment, or null when the path is not part of the site
 *
 * @example
 * ```typescript
 * docPathToUrl(map, 'guides/quick-start');
 * // 'guides/quick-start' with the path strategy
 * // 'a3f2e9d1-4b8c7e6f-9d2a1b3c' with the hash strategy
 * ```
 */
export function docPathToUrl(map: UrlMap, docPath: string): string | null {
  const normalized = normalizeSlug(docPath);
  return map.toUrl[normalized] ?? null;
}

/**
 * Resolves a URL segment back to its content path.
 *
 * @param map - Precomputed URL mapping
 * @param slug - URL segment, with or without surrounding slashes
 * @returns The content path, or null when the segment matches no document
 */
export function urlToDocPath(map: UrlMap, slug: string): string | null {
  const normalized = normalizeSlug(slug);
  return map.toPath[normalized] ?? null;
}

/**
 * Whether a tab-store path is a route rather than a content path.
 *
 * Tabs record the pages they visit as content paths, but the graph and tag
 * views have none, so those are recorded as the route itself. A leading slash
 * tells the two apart: content paths never carry one.
 *
 * @param path - Value stored as a tab's `path`
 * @returns true when the value is already an href
 */
export function isRoutePath(path: string): boolean {
  return path.startsWith('/');
}

/**
 * Builds an `href` for a content path, ready to hand to a link or router.
 *
 * Falls back to the root path when the document is unknown, which keeps
 * navigation from emitting `/null` for a stale or mistyped reference. A value
 * that is already a route (see `isRoutePath`) is returned untouched.
 *
 * @param map - Precomputed URL mapping
 * @param docPath - Content-relative path without extension, or a route
 * @returns A root-relative href
 *
 * @example
 * ```typescript
 * hrefFor(map, 'guides/quick-start'); // '/guides/quick-start'
 * hrefFor(map, 'does-not-exist'); // '/'
 * hrefFor(map, '/graph/'); // '/graph/'
 * ```
 */
export function hrefFor(map: UrlMap, docPath: string | undefined): string {
  if (!docPath) return '/';
  if (isRoutePath(docPath)) return docPath;
  const url = docPathToUrl(map, docPath);
  return url ? `/${url}` : '/';
}
