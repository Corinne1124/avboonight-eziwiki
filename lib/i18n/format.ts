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
