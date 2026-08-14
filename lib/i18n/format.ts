/**
 * Substitutes `{placeholders}` in a translated string.
 *
 * Word order differs between languages, and a sentence assembled by
 * concatenation can only ever be built in one of them. A placeholder lets each
 * translation put the count, the date or the title where its own grammar needs
 * it.
 *
 * Kept apart from the tables in `strings.ts` deliberately: client components
 * need this function but receive their strings as data, and importing it from
 * there would pull every translation into the browser bundle to reach a
 * fifteen-line replace.
 *
 * @param template - String containing `{name}` placeholders
 * @param values - Replacements, keyed by placeholder name
 * @returns The filled string, with unknown placeholders left as written
 *
 * @example
 * ```typescript
 * format('Linked from {count} pages', { count: 3 }); // 'Linked from 3 pages'
 * ```
 */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole,
  );
}

/** Units a file size steps through, largest last. */
const UNITS = ['B', 'KB', 'MB', 'GB'];

/**
 * Renders a byte count the way a reader reads it.
 *
 * Here rather than beside its callers because there are two of them on
 * opposite sides of the build: the markup for a document shown as images is
 * written on the server, and the viewer's header is written in the browser.
 * Two copies would eventually round differently and label the same file twice
 * over with two different sizes.
 *
 * @param bytes - Size on disk
 * @returns A short label such as `2.4 MB`
 *
 * @example
 * ```typescript
 * formatBytes(3976); // '3.9 KB'
 * formatBytes(940); // '940 B'
 * ```
 */
export function formatBytes(bytes: number): string {
  let value = bytes;
  let unit = 0;

  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }

  // One decimal below ten, none above: `1.2 MB` is informative, `847.3 KB` is
  // three digits of noise.
  return `${value < 10 && unit > 0 ? value.toFixed(1) : Math.round(value)} ${UNITS[unit]}`;
}
