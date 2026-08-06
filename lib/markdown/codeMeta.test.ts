import { describe, it, expect } from 'vitest';
import { parseCodeMeta } from './codeMeta';

describe('parseCodeMeta', () => {
  it('reads nothing from a fence that said nothing', () => {
    expect(parseCodeMeta(undefined)).toEqual({ highlights: [], lineNumbers: false });
    expect(parseCodeMeta('')).toEqual({ highlights: [], lineNumbers: false });
  });

  it('reads a quoted title', () => {
    expect(parseCodeMeta('title="src/index.ts"').title).toBe('src/index.ts');
    expect(parseCodeMeta("title='src/index.ts'").title).toBe('src/index.ts');
  });

  it('reads an unquoted title', () => {
    expect(parseCodeMeta('title=src/index.ts').title).toBe('src/index.ts');
  });

  it('accepts `file=` as well, which other generators use', () => {
    expect(parseCodeMeta('file="app/page.tsx"').title).toBe('app/page.tsx');
  });

  it('expands a list and a range of highlights', () => {
    expect(parseCodeMeta('{2,4-6}').highlights).toEqual([2, 4, 5, 6]);
  });

  it('sorts and deduplicates overlapping ranges', () => {
    expect(parseCodeMeta('{5,1-3,2}').highlights).toEqual([1, 2, 3, 5]);
  });

  it('tolerates spaces inside the braces', () => {
    expect(parseCodeMeta('{ 1, 3 - 4 }').highlights).toEqual([1, 3, 4]);
  });

  it('ignores a range that runs backwards', () => {
    // A typo, not an instruction — expanding it either way would mark lines
    // the author never named.
    expect(parseCodeMeta('{6-2}').highlights).toEqual([]);
  });

  it('ignores line zero and absurd ranges', () => {
    expect(parseCodeMeta('{0}').highlights).toEqual([]);
    expect(parseCodeMeta('{1-99999999}').highlights).toEqual([]);
  });

  it('reads the line-number flag', () => {
    expect(parseCodeMeta('showLineNumbers').lineNumbers).toBe(true);
    expect(parseCodeMeta('ts showLineNumbers').lineNumbers).toBe(true);
    expect(parseCodeMeta('showLineNumbersElsewhere').lineNumbers).toBe(false);
  });

  it('reads every annotation from one line', () => {
    expect(parseCodeMeta('title="src/a.ts" {2,4-6} showLineNumbers')).toEqual({
      title: 'src/a.ts',
      highlights: [2, 4, 5, 6],
      lineNumbers: true,
    });
  });

  it('leaves an annotation meant for something else alone', () => {
    // The information line is shared ground; a fence carrying another tool's
    // annotation should still render as the code it is.
    expect(parseCodeMeta('twoslash copy=false')).toEqual({
      title: undefined,
      highlights: [],
      lineNumbers: false,
    });
  });
});
