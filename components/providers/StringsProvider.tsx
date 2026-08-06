'use client';

import React, { createContext, useContext } from 'react';
import type { Strings } from '@/lib/i18n/strings';

/**
 * Makes the interface's own words available to client components.
 *
 * Resolved on the server from `global.lang` and passed down as plain data, so
 * the browser receives the one language this wiki is written in rather than
 * every language the project has been translated into.
 */

// Null rather than the English table: importing that here would pull every
// translation into the browser bundle to serve as a default that is never
// reached, since the provider wraps the whole tree from the root layout.
const StringsContext = createContext<Strings | null>(null);

/**
 * Provides the resolved strings to the client component tree.
 *
 * @param props.value - Strings produced on the server by `getStrings()`
 * @param props.children - Subtree that may consume them
 */
export function StringsProvider({
  value,
  children,
}: {
  value: Strings;
  children: React.ReactNode;
}) {
  return <StringsContext.Provider value={value}>{children}</StringsContext.Provider>;
}

/**
 * Reads the interface strings.
 *
 * @returns The wiki's own words
 *
 * @example
 * ```tsx
 * const t = useStrings();
 * <h2>{t.onThisPage}</h2>;
 * ```
 */
export function useStrings(): Strings {
  const strings = useContext(StringsContext);

  if (!strings) {
    throw new Error('useStrings() was called outside StringsProvider');
  }

  return strings;
}
