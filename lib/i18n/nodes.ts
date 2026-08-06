import { createElement, Fragment, type ReactNode } from 'react';

/**
 * Fills `{placeholders}` in a string with rendered elements.
 *
 * The string version of this, `format()`, can only produce text — but some
 * sentences have a link, a `<time>` or a piece of marked-up code inside them.
 * Assembling those by concatenating fragments would fix the word order in
 * whichever language the fragments were written in; a translation needs to put
 * the element wherever its own grammar wants it.
 *
 * @param template - String containing `{name}` placeholders
 * @param values - Nodes to substitute, keyed by placeholder name
 * @returns The filled sentence, ready to render
 *
 * @example
 * ```typescript
 * formatNodes(t.continueTo, { title: createElement('strong', null, title) });
 * ```
 */
export function formatNodes(template: string, values: Record<string, ReactNode>): ReactNode[] {
  // The capture group makes `split` keep the placeholder names, so the result
  // alternates literal text and placeholder: even indices are text.
  return template.split(/\{(\w+)\}/g).map((part, index) => {
    if (index % 2 === 0) return part;

    return createElement(
      Fragment,
      { key: `${part}-${index}` },
      part in values ? values[part] : `{${part}}`,
    );
  });
}
