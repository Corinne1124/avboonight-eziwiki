import { NavigationItem } from '../payload/types';

/**
 * Recursively extracts all paths from a navigation tree structure
 *
 * This function traverses the entire navigation hierarchy and collects
 * all path values, which are used to generate static pages at build time.
 * Items without a path property are skipped (they act as section headers).
 * Hidden items are included in the extraction (they're just hidden from UI).
 *
 * @param items - Array of navigation items to process
 * @returns Flat array of all path strings found in the navigation tree
 *
 * @example
 * ```typescript
 * const navigation = [
 *   { name: 'Home', path: 'home' },
 *   {
 *     name: 'Guides',
 *     children: [
 *       { name: 'Quick Start', path: 'guides/quick-start' },
 *       { name: 'Config', path: 'guides/config' }
 *     ]
 *   }
 * ];
 *
 * const paths = extractAllPaths(navigation);
 * // Returns: ['home', 'guides/quick-start', 'guides/config']
 * ```
 */
export function extractAllPaths(items: NavigationItem[]): string[] {
  const paths: string[] = [];

  function traverse(items: NavigationItem[]) {
    for (const item of items) {
      if (item.path) {
        paths.push(item.path);
      }
      if (item.children) {
        traverse(item.children);
      }
    }
  }

  traverse(items);
  return paths;
}

/**
 * Filter out hidden navigation items
 *
 * Recursively removes items marked as hidden from the navigation tree.
 * This is used to hide items from the sidebar while keeping them accessible via URL.
 *
 * @param items - Array of navigation items to filter
 * @returns Filtered navigation tree without hidden items
 *
 * @example
 * ```typescript
 * const navigation = [
 *   { name: 'Public', path: 'public' },
 *   { name: 'Secret', path: 'secret', hidden: true }
 * ];
 *
 * const visible = filterHiddenItems(navigation);
 * // Returns: [{ name: 'Public', path: 'public' }]
 * ```
 */
export function filterHiddenItems(items: NavigationItem[]): NavigationItem[] {
  return items
    .filter((item) => !item.hidden)
    .map((item) => ({
      ...item,
      children: item.children ? filterHiddenItems(item.children) : undefined,
    }));
}

/**
 * Flattens a navigation tree to the label each page carries.
 *
 * The sidebar renders the tree; nothing else needs its shape. The tab bar shows
 * a title for the page a tab is on, and the only statement it makes about the
 * tree is that a document's label is its name — so it is given that, rather
 * than the whole hierarchy.
 *
 * That matters at the size of a site: the tree is sent to the browser once per
 * page and again on every client-side navigation, and on this wiki it is around
 * ninety entries with children arrays, paths, icons and colours, of which the
 * tab bar reads one string.
 *
 * A page that heads a folder appears twice in the tree — once as the folder's
 * node and once as the page — and the page's own title is the one that belongs
 * to the document, so children are visited after their parent and win.
 *
 * @param items - Navigation tree
 * @returns Labels keyed by content path
 *
 * @example
 * ```typescript
 * pageTitles([{ name: 'Guides', children: [{ name: 'Setup', path: 'guides/setup' }] }]);
 * // { 'guides/setup': 'Setup' }
 * ```
 */
export function pageTitles(items: NavigationItem[]): Record<string, string> {
  const titles: Record<string, string> = {};

  function traverse(nodes: NavigationItem[]) {
    for (const node of nodes) {
      if (node.path) titles[node.path] = node.name;
      if (node.children) traverse(node.children);
    }
  }

  traverse(items);
  return titles;
}

/**
 * Recursively searches navigation tree to find the item matching the current path
 *
 * This function is used to highlight the active navigation item in the sidebar.
 * It performs a depth-first search through the navigation hierarchy to find
 * the item whose path matches the current page path.
 *
 * @param items - Array of navigation items to search
 * @param currentPath - Current page path to match against
 * @returns The matching NavigationItem if found, null otherwise
 *
 * @example
 * ```typescript
 * const navigation = [
 *   { name: 'Home', path: 'home' },
 *   {
 *     name: 'Guides',
 *     children: [
 *       { name: 'Quick Start', path: 'guides/quick-start' }
 *     ]
 *   }
 * ];
 *
 * const activeItem = findActiveItem(navigation, 'guides/quick-start');
 * // Returns: { name: 'Quick Start', path: 'guides/quick-start' }
 *
 * const notFound = findActiveItem(navigation, 'nonexistent');
 * // Returns: null
 * ```
 */
export function findActiveItem(
  items: NavigationItem[],
  currentPath: string,
): NavigationItem | null {
  for (const item of items) {
    if (item.path === currentPath) {
      return item;
    }
    if (item.children) {
      const found = findActiveItem(item.children, currentPath);
      if (found) return found;
    }
  }
  return null;
}
