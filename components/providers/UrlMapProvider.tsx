'use client';

import React, { createContext, useContext, useMemo } from 'react';
import {
  EMPTY_URL_MAP,
  docPathToUrl,
  hrefFor,
  unpackUrlMap,
  urlToDocPath,
  type PackedUrlMap,
  type UrlMap,
} from '@/lib/navigation/url';

/**
 * Makes the build-time URL mapping available to client components.
 *
 * The mapping is computed on the server — under the hash strategy that means
 * running SHA-256 over every content path — and passed down as plain data.
 * Client components look URLs up instead of deriving them, so the hashing
 * implementation never reaches the browser bundle.
 */

const UrlMapContext = createContext<UrlMap>(EMPTY_URL_MAP);

/** Helpers bound to the current URL map. */
export interface UrlMapHelpers {
  /** The raw mapping */
  map: UrlMap;
  /** Builds a root-relative href for a content path */
  href: (docPath: string | undefined) => string;
  /** Resolves a content path to its URL segment */
  toUrl: (docPath: string) => string | null;
  /** Resolves a URL segment back to its content path */
  toPath: (slug: string) => string | null;
}

/**
 * Provides the URL map to the client component tree.
 *
 * The map arrives in its packed form and is expanded here, once per provider
 * rather than once per page: the two lookup tables it becomes are derived from
 * the pairs the server sent, and sending those tables ready-made would put
 * every name on the wire twice.
 *
 * @param props.value - Mapping produced on the server by `getUrlMap()`
 * @param props.children - Subtree that may consume the mapping
 */
export function UrlMapProvider({
  value,
  children,
}: {
  value: PackedUrlMap;
  children: React.ReactNode;
}) {
  const map = useMemo(() => unpackUrlMap(value), [value]);

  return <UrlMapContext.Provider value={map}>{children}</UrlMapContext.Provider>;
}

/**
 * Reads the URL map and its bound helpers.
 *
 * @returns Helpers for converting between content paths and URLs
 *
 * @example
 * ```tsx
 * const { href } = useUrlMap();
 * <Link href={href('guides/quick-start')}>Quick Start</Link>;
 * ```
 */
export function useUrlMap(): UrlMapHelpers {
  const map = useContext(UrlMapContext);

  return useMemo(
    () => ({
      map,
      href: (docPath: string | undefined) => hrefFor(map, docPath),
      toUrl: (docPath: string) => docPathToUrl(map, docPath),
      toPath: (slug: string) => urlToDocPath(map, slug),
    }),
    [map],
  );
}
