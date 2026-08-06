/**
 * What a fence says about itself beyond its language.
 *
 * The information line of a fence — everything after the language — is free
 * text as far as Markdown is concerned. The conventions parsed here are the
 * ones GitHub-adjacent tooling has settled on, so a document written for
 * another generator keeps its meaning:
 *
 * ```text
 * ```ts title="src/index.ts" {2,4-6} showLineNumbers
 * ```
 */
export interface CodeMeta {
  /** Name shown in place of the language, usually a file path */
  title?: string;
  /** 1-based line numbers to mark as the ones worth reading */
  highlights: number[];
  /** Whether to number the lines down the gutter */
  lineNumbers: boolean;
}

/** A fence that said nothing beyond its language. */
const EMPTY: CodeMeta = { highlights: [], lineNumbers: false };

/**
 * Upper bound on a line range, so `{1-999999999}` cannot be asked for.
 *
 * A range is expanded into individual line numbers, which is cheap for the
 * dozen lines a real example has and ruinous for a typo. The cap is far above
 * any code block a person would put on a page.
 */
const MAX_LINE = 10_000;

/**
 * Expands a highlight specification into line numbers.
 *
 * @param spec - Contents of the braces, e.g. `2,4-6`
 * @returns Ascending line numbers, without duplicates
 */
function parseHighlights(spec: string): number[] {
  const lines = new Set<number>();

  for (const part of spec.split(',')) {
    // Whitespace is stripped rather than trimmed: `3 - 4` is a range someone
    // spaced out for legibility, not a malformed one.
    const range = part.replace(/\s+/g, '');
    if (!range) continue;

    const match = /^(\d+)(?:-(\d+))?$/.exec(range);
    if (!match) continue;

    const from = Number(match[1]);
    const to = match[2] ? Number(match[2]) : from;

    // A descending range is a typo rather than an instruction, and expanding
    // it either way would mark lines the author did not name.
    if (from < 1 || to < from || to > MAX_LINE) continue;

    for (let line = from; line <= to; line += 1) lines.add(line);
  }

  return [...lines].sort((a, b) => a - b);
}

/**
 * Reads a fence's information line.
 *
 * Anything unrecognised is ignored rather than rejected: the information line
 * is shared ground, and a fence carrying an annotation meant for some other
 * tool should still render as the code it is.
 *
 * @param meta - Text following the language on the fence line
 * @returns What the fence asked for
 *
 * @example
 * ```typescript
 * parseCodeMeta('title="src/a.ts" {2,4-6} showLineNumbers');
 * // { title: 'src/a.ts', highlights: [2, 4, 5, 6], lineNumbers: true }
 * ```
 */
export function parseCodeMeta(meta: string | undefined): CodeMeta {
  if (!meta) return EMPTY;

  const title = /(?:title|file)=(?:"([^"]*)"|'([^']*)'|(\S+))/.exec(meta);
  const highlights = /\{([\d,\s-]*)\}/.exec(meta);

  return {
    title: title ? (title[1] ?? title[2] ?? title[3]) : undefined,
    highlights: highlights ? parseHighlights(highlights[1]) : [],
    lineNumbers: /(?:^|\s)(?:showLineNumbers|showlinenumbers)(?:$|[\s=])/.test(meta),
  };
}
