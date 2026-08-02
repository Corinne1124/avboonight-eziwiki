/**
 * Base path the site is served from, empty when served from the root.
 *
 * Set by the deploy workflow, and read here rather than inferred from CI so
 * that tests, forks, and local builds are unaffected. `next.config.js` reads
 * the same variable to configure Next itself; everything on this side of the
 * build reads it through this module.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

/**
 * Prefixes a path served from `public/` with the deployment base path.
 *
 * Next rewrites the links and assets it generates itself, but not a `href` or
 * a `url()` written by hand — those keep pointing at the domain root and 404
 * once the site moves into a subdirectory. Anything referencing `public/`
 * outside of Next's own output has to go through here.
 *
 * Absolute and protocol-relative URLs are returned untouched, so a favicon or
 * an image hosted elsewhere keeps working.
 *
 * @param path - Root-relative public path, such as `/favicon.svg`
 * @returns The path as the browser should request it
 *
 * @example
 * ```typescript
 * asset('/favicon.svg'); // '/eziwiki/favicon.svg' when deployed to /eziwiki
 * asset('https://cdn.example.com/logo.svg'); // unchanged
 * ```
 */
export function asset(path: string): string {
  if (!BASE_PATH) return path;
  if (!path.startsWith('/') || path.startsWith('//')) return path;
  return `${BASE_PATH}${path}`;
}
