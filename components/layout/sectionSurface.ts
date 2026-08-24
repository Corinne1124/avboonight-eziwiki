import type { CSSProperties } from 'react';

/**
 * Shared styling for navigation items sitting on a coloured section.
 *
 * A coloured section keeps its colour in both themes, so feedback there is an
 * overlay in the ink colour rather than the theme-keyed greys — which would
 * vanish against a background they were never written for. Kept under
 * `components/` because Tailwind only scans class strings here, not in `lib/`.
 */

/** Hover and press overlays for a surface of the given brightness. */
export function pressOverlay(isLight: boolean): string {
  return isLight ? 'hover:bg-black/5 active:bg-black/10' : 'hover:bg-white/10 active:bg-white/20';
}

/**
 * The active page on a coloured section, lifted off on a white surface. The
 * page you are on is marked by brightness rather than by colour: sections
 * carry whatever colour their `_meta.json` names, so there is no highlight
 * colour that could not clash with one. The ring is what keeps the edge
 * legible on tints pale enough that white alone barely clears them.
 */
export const ACTIVE_ON_COLOR_CLASSES = 'font-medium shadow-sm ring-1 ring-black/10';

/** Inline half of the active surface; a coloured section needs no dark variant. */
export const ACTIVE_ON_COLOR_STYLE: CSSProperties = {
  backgroundColor: '#ffffff',
  color: 'rgb(31, 41, 55)', // gray-800
};
