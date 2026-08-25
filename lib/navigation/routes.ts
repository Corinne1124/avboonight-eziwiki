import { getContentRegistry } from '../content/registry';
import { getSite } from '../site';
import { docPathToUrl } from './url';

/**
 * Addresses the app keeps for views of its own.
 *
 * Next resolves these routes before the catch-all that serves content, so a
 * page whose URL began with one would be built, listed in the sidebar, the
 * sitemap and search — and answer with the graph or the tag index instead.
 * Server-only.
 */

/** First URL segments that are routes rather than pages. */
export const RESERVED_SEGMENTS = ['graph', 'tags'];

/**
 * Whether a URL segment falls under a reserved route.
 *
 * @param url - URL segment without surrounding slashes
 * @returns true when the app would serve its own view there
 */
export function isReservedUrl(url: string): boolean {
  return RESERVED_SEGMENTS.some((segment) => url === segment || url.startsWith(`${segment}/`));
}

/**
 * Reports content pages whose URLs the app's own routes would shadow.
 *
 * Surfacing them is better than letting a page quietly disappear; the fix is
 * to rename the file or the directory. Under the `hash` strategy nothing can
 * collide, since a digest never spells a route.
 *
 * @returns Paths that collide, empty when none do
 */
export function findRouteCollisions(): string[] {
  const { docs } = getContentRegistry();
  const { urlMap } = getSite();

  return docs
    .filter((doc) => {
      const url = docPathToUrl(urlMap, doc.path);
      return url !== null && isReservedUrl(url);
    })
    .map((doc) => doc.path);
}
