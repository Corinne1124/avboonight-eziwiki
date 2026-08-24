import React from 'react';

/**
 * Collapsible container for a navigation subtree.
 *
 * Animated through grid rows rather than a capped max-height: a cap stays in
 * force after the transition, so any section taller than it was clipped for
 * good — a limit an author reaches by simply writing enough pages. Fractional
 * rows track the real content height instead. The inner wrapper is what
 * actually clips, and needs `min-h-0` so the collapsed row can shrink below
 * the content's own minimum size.
 */
export function Collapse({
  expanded,
  style,
  children,
}: {
  expanded: boolean;
  /** Extra container styles, e.g. a coloured section's background */
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div
      className="grid transition-[grid-template-rows] duration-[120ms]"
      style={{ gridTemplateRows: expanded ? '1fr' : '0fr', ...style }}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
