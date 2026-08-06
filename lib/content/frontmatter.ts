/**
 * Writing frontmatter, as opposed to reading it.
 *
 * The registry parses what is already in a file; this composes what goes into
 * a new one. Only the parts that cannot be written by concatenation live here
 * — which, for YAML, is most of them.
 */

/**
 * Renders a string as a YAML scalar.
 *
 * `title: Setup: The Basics` is not a title with a colon in it. It is a parse
 * error, and the page it lands in cannot be read at all. Titles with colons
 * are ordinary, so a value is quoted whenever a plain scalar would be
 * ambiguous — and left alone when it would not, because most titles need
 * nothing and quoting every one of them is noise in the file the author opens
 * next.
 *
 * @param value - Text to place after the key
 * @returns The value, quoted and escaped only if it has to be
 *
 * @example
 * ```typescript
 * yamlScalar('Quick Start'); // 'Quick Start'
 * yamlScalar('Setup: The Basics'); // '"Setup: The Basics"'
 * ```
 */
export function yamlScalar(value: string): string {
  // Safe unquoted only when it opens with a letter or digit — anything else is
  // a YAML indicator — and carries neither `:` nor `#`, both of which YAML
  // reads as structure rather than as text.
  if (value === value.trim() && /^[\p{L}\p{N}][^:#]*$/u.test(value)) return value;

  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
