import { describe, it, expect } from 'vitest';
import { renderLlmsTxt, oneLine } from './llms';
import { getSite } from '../site';
import { getReadingOrder } from '../navigation/sequence';
import { getDoc } from './registry';
import { docPathToUrl } from '../navigation/url';

const file = renderLlmsTxt();

describe('renderLlmsTxt', () => {
  it('opens with the wiki’s name and what it is', () => {
    const { global } = getSite();
    const [heading, blank, summary] = file.split('\n');

    expect(heading).toBe(`# ${global.title}`);
    expect(blank).toBe('');
    expect(summary).toBe(`> ${global.description}`);
  });

  it('lists pages in reading order', () => {
    const { hiddenPaths } = getSite();
    const listed = [...file.matchAll(/^- \[([^\]]+)\]/gm)].map((m) => m[1]);
    const expected = getReadingOrder()
      .filter((path) => !hiddenPaths.has(path))
      .flatMap((path) => {
        const doc = getDoc(path);
        return doc ? [doc.title] : [];
      });

    expect(listed).toEqual(expected);
  });

  it('gives every page an absolute URL', () => {
    const hrefs = [...file.matchAll(/^- \[[^\]]+\]\(([^)]+)\)/gm)].map((m) => m[1]);

    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) expect(href).toMatch(/^https?:\/\//);
  });

  it('leaves hidden pages out', () => {
    // Unlisted on purpose. A file that summarises the whole wiki for a reader
    // is exactly where they must not reappear.
    const { hiddenPaths, urlMap } = getSite();
    let checked = 0;

    for (const path of hiddenPaths) {
      const doc = getDoc(path);
      if (!doc) continue;

      expect(file, doc.title).not.toContain(`- [${doc.title}]`);

      const url = docPathToUrl(urlMap, path);
      if (url) expect(file, url).not.toContain(`${url}/`);

      checked += 1;
    }

    expect(checked, 'no hidden page to check against').toBeGreaterThan(0);
  });

  it('keeps each entry to a single line', () => {
    // The convention is read, not parsed; an entry that wraps stops being a
    // list item and starts being prose.
    for (const line of file.split('\n')) {
      if (line.startsWith('- ')) expect(line.length).toBeLessThan(400);
    }
  });

  it('summarises with one sentence rather than a paragraph', () => {
    const summaries = [...file.matchAll(/^- \[[^\]]+\]\([^)]+\): (.+)$/gm)].map((m) => m[1]);

    expect(summaries.length).toBeGreaterThan(0);
    for (const summary of summaries) {
      expect(summary.split('. ').length, summary).toBeLessThanOrEqual(2);
    }
  });
});

describe('oneLine', () => {
  it('keeps the first sentence', () => {
    expect(oneLine('Get going in 5 minutes. Then read the rest.')).toBe('Get going in 5 minutes.');
  });

  it('splits a sentence that ends in a character no Latin range contains', () => {
    // With an ASCII letter class this never matched, so every entry in a
    // Korean or Japanese wiki carried a whole paragraph.
    expect(oneLine('빠른 시작 안내입니다. 자세한 내용은 다음 장에서 다룹니다.')).toBe(
      '빠른 시작 안내입니다.',
    );
  });

  it('accepts a full stop that needs no space after it', () => {
    expect(oneLine('5分で始められます。詳細は次章で。')).toBe('5分で始められます。');
    expect(oneLine('빠른 시작입니다。다음 장에서 계속。')).toBe('빠른 시작입니다。');
  });

  it('does not split inside a word or a number', () => {
    expect(oneLine('Built on node.js and shipped as 1.2 of the package')).toBe(
      'Built on node.js and shipped as 1.2 of the package',
    );
  });

  it('collapses whitespace and survives having none of it', () => {
    expect(oneLine('  a   paragraph\nwrapped  ')).toBe('a paragraph wrapped');
    expect(oneLine('   ')).toBe('');
  });

  it('truncates a sentence too long to be a summary', () => {
    const long = `${'word '.repeat(80)}end.`;
    const out = oneLine(long);

    expect(out.length).toBeLessThanOrEqual(200);
    expect(out.endsWith('…')).toBe(true);
  });
});
