'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

/**
 * Props for the PageTransition component
 */
interface PageTransitionProps {
  /** Child content to animate */
  children: React.ReactNode;
}

/**
 * Fades a page in when the reader arrives at it.
 *
 * Keyed on the path, so React replaces the element on a route change and the
 * animation runs again from the start. That is the whole mechanism: no state,
 * no timer, and nothing that has to render an invisible copy of the page first
 * in order to have something to fade from.
 *
 * The version this replaces did have all three. It set `opacity-0` on arrival,
 * waited 50ms on a timer, then transitioned `all` over 500ms — so half a second
 * of fade sat on top of however long the navigation itself took, and for the
 * first stretch of it the page the reader had just asked for was blank. The
 * animation here is short enough to read as a softening rather than a wait, and
 * touches only opacity, which the compositor can handle without laying out the
 * fifteen thousand pixels of article underneath.
 *
 * @param props - Component props
 * @param props.children - Content to wrap with transition effects
 *
 * @example
 * ```tsx
 * <PageTransition>
 *   <article>Content here</article>
 * </PageTransition>
 * ```
 */
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="ezw-page-enter">
      {children}
    </div>
  );
}
