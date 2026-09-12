'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useTabStore } from '@/lib/store/tabStore';
import { useUrlMap } from '@/components/providers/UrlMapProvider';
import { normalizeSlug } from '@/lib/navigation/url';

interface TabInitializerProps {
  /**
   * Labels keyed by content path, from `pageTitles`.
   *
   * A flat record rather than the navigation tree: a tab records the title of
   * the page it is on, which is the only thing this needs from a tree that is
   * otherwise rendered on the server and sent separately.
   */
  titles: Record<string, string>;
}

/**
 * Routes that a tab can show but that have no content path behind them.
 *
 * They are recorded as the route itself (see `isRoutePath`), so that the back
 * button can return to the graph a reader clicked out of. Anything else that
 * resolves to no document — a former address on its way to a redirect, a 404 —
 * is left unrecorded: an entry for it would only forward the reader away again.
 */
const APP_ROUTES = ['/graph', '/tags'];

function isAppRoute(pathname: string): boolean {
  return APP_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

/** The tab title for an app route: '/tags/deployment/' becomes 'Tags'. */
function routeTitle(pathname: string): string {
  const [segment = ''] = normalizeSlug(pathname).split('/');
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

/** What a tab records for a pathname, or null when it should record nothing. */
interface TabEntry {
  path: string;
  title: string;
}

/**
 * Initializes tabs on first load and handles URL changes
 */
export function TabInitializer({ titles }: TabInitializerProps) {
  const pathname = usePathname();
  const { toPath } = useUrlMap();
  const { tabs, addTab, activeTabId, navigateInHistory, hasHydrated } = useTabStore();
  const isInitialMount = useRef(true);
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (!hasHydrated) return;

    const resolve = (): TabEntry | null => {
      if (pathname === '/') return { path: '', title: 'New Tab' };

      const docPath = toPath(pathname);
      if (docPath !== null) {
        return { path: docPath, title: titles[docPath] || 'New Tab' };
      }

      return isAppRoute(pathname) ? { path: pathname, title: routeTitle(pathname) } : null;
    };

    const entry = resolve();

    // No tabs — a first visit, or the list emptied after mount. Not gated on
    // the initial mount, because the tab bar shows only its skeleton while
    // the list is empty: this branch is what brings the bar back, whatever
    // emptied it. An unrecordable route still gets a tab, pointed home.
    if (tabs.length === 0) {
      addTab(entry ?? { title: 'New Tab', path: '' });

      isInitialMount.current = false;
      previousPathname.current = pathname;
      return;
    }

    // Initial mount with saved tabs. Recorded as a navigation rather than
    // written over the tab's current entry: reloading the page a tab already
    // shows then changes nothing, and loading another page directly keeps
    // the one the tab was on reachable behind it.
    if (isInitialMount.current) {
      if (activeTabId && entry) {
        navigateInHistory(activeTabId, entry.path, entry.title);
      }

      isInitialMount.current = false;
      previousPathname.current = pathname;
      return;
    }

    // URL changed - add to history
    if (pathname !== previousPathname.current) {
      previousPathname.current = pathname;

      if (activeTabId && entry) {
        navigateInHistory(activeTabId, entry.path, entry.title);
      }
    }
  }, [hasHydrated, tabs.length, pathname, titles, toPath, addTab, activeTabId, navigateInHistory]);

  return null;
}
