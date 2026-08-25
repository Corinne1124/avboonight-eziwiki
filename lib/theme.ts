import type { ThemeConfig } from './payload/types';

/**
 * Turns the payload's `theme` into the custom properties the stylesheets read.
 *
 * The keys had been documented, typed, validated and carried into the site
 * model since the project began — and applied nowhere. Setting `primary` to
 * a brand colour changed nothing, on any page.
 *
 * The values are the light palette: the defaults the documentation shows are
 * white paper and dark ink, and applied in dark mode they would undo it. So
 * they are scoped to `html:not(.dark)`, which also outranks the `:root` block
 * in `theme.css` whatever order the stylesheets arrive in. Dark mode keeps
 * its own palette. Hover shades are derived, since a stylesheet default next
 * to an author's colour would flip to blue on hover.
 */

/** Custom property each theme key sets, in the order the stylesheet declares them. */
const THEME_VARS: Record<keyof ThemeConfig, string> = {
  primary: '--color-primary',
  secondary: '--color-secondary',
  background: '--color-background',
  text: '--color-text',
  sidebarBg: '--color-sidebar-bg',
  codeBg: '--color-code-bg',
};

/** Keys whose hover shade is derived from the colour itself. */
const HOVER_VARS: Partial<Record<keyof ThemeConfig, string>> = {
  primary: '--color-primary-hover',
  secondary: '--color-secondary-hover',
};

/**
 * Builds the stylesheet for a theme, or an empty string when it sets nothing.
 *
 * @param theme - `theme` from the payload, possibly absent or partial
 * @returns CSS to emit in `<head>`
 *
 * @example
 * ```typescript
 * themeCss({ primary: '#e11d48' });
 * // 'html:not(.dark){--color-primary:#e11d48;--color-primary-hover:color-mix(in srgb,#e11d48 85%,black)}'
 * ```
 */
export function themeCss(theme: Partial<ThemeConfig> | undefined): string {
  if (!theme) return '';

  const declarations: string[] = [];

  for (const [key, name] of Object.entries(THEME_VARS) as [keyof ThemeConfig, string][]) {
    const value = theme[key]?.trim();
    if (!value) continue;

    declarations.push(`${name}:${value}`);

    const hover = HOVER_VARS[key];
    if (hover) declarations.push(`${hover}:color-mix(in srgb,${value} 85%,black)`);
  }

  return declarations.length ? `html:not(.dark){${declarations.join(';')}}` : '';
}
