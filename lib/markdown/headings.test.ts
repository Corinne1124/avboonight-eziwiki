import { describe, it, expect } from 'vitest';
import { getDocHeadings, renderDoc } from './render';
import { getAllDocPaths } from '../content/registry';

/**
 * The headings-only pass exists to save the search index a full render. It is
 * only safe while it produces exactly the ids the page emits — a drift of one
 * character sends every section link in search results to the wrong place, and
 * nothing else would notice.
 */
describe('getDocHeadings', () => {
  const paths = getAllDocPaths();

  it('has documents to check', () => {
    expect(paths.length).toBeGreaterThan(5);
  });

  it('matches the full render for every document', async () => {
    for (const path of paths) {
      const short = await getDocHeadings(path);
      const full = (await renderDoc(path))?.headings ?? [];

      expect(short, path).toEqual(full);
    }
  });

  it('finds headings at all, rather than agreeing on nothing', async () => {
    // Two empty lists are equal, which would make the test above pass while
    // the pass produced no ids whatsoever.
    const counts = await Promise.all(paths.map(async (p) => (await getDocHeadings(p)).length));

    expect(Math.max(...counts)).toBeGreaterThan(3);
  });

  it('returns nothing for a document that does not exist', async () => {
    expect(await getDocHeadings('no/such/page')).toEqual([]);
  });
});
