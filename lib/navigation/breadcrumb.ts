import type { NavigationItem } from '../payload/types';

/**
 * The path through the navigation tree to a page.
 *
 * Used twice over: once to draw the trail a reader sees, and once to state the
 * same trail as structured data. They have to be the same walk — structured
 * data describing a breadcrumb the page does not show is worse than none,
 * being the kind of mismatch a search engine treats as a reason to distrust
 * the rest of the markup.
 */

/** One step of the trail. */
export interface Crumb {
  /** Label as it appears in navigation */
  name: string;
  /** Content path, absent for a section that is only a heading */
  path?: string;
}

/**
 * Finds the trail from the top of the navigation tree down to a page.
 *
 * Depth-first, returning the first match: a page listed twice is shown at the
 * first place it appears, which is the one a reader following the sidebar from
 * the top would reach.
 *
 * @param items - Navigation tree, or a subtree during recursion
 * @param targetPath - Content path being looked for
 * @param trail - Steps accumulated so far
 * @returns The steps ending at the page, or null when it is not in the tree
 *
 * @example
 * ```typescript
 * getBreadcrumbTrail(navigation, 'guides/setup');
 * // [{ name: 'Guides' }, { name: 'Setup', path: 'guides/setup' }]
 * ```
 */
export function getBreadcrumbTrail(
  items: NavigationItem[],
  targetPath: string,
  trail: Crumb[] = [],
): Crumb[] | null {
  for (const item of items) {
    if (item.path === targetPath) {
      return [...trail, { name: item.name, path: item.path }];
    }

    if (item.children) {
      const found = getBreadcrumbTrail(item.children, targetPath, [
        ...trail,
        { name: item.name, path: item.path },
      ]);

      if (found) return found;
    }
  }

  return null;
}
