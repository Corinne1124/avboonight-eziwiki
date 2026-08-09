import { describe, it, expect } from 'vitest';
import { CACHE_DERIVED_CONTENT, cached, currentMap, stamp, contentGeneration } from './cache';
import { getContentRegistry } from './content/registry';
import { getUrlMap } from './navigation/urlMap';
import { getLinkGraph } from './graph/build';

describe('cached', () => {
  it('returns nothing when nothing is stored', () => {
    expect(cached(null, stamp())).toBeNull();
  });

  it('returns the value while it belongs to the current content', () => {
    const s = stamp();
    s.at = contentGeneration();

    expect(cached('built', s)).toBe('built');
  });

  it('refuses a value built for content that has since changed', () => {
    // Only meaningful in development, where the generation moves. Under the
    // build's settings a stamp is never consulted at all.
    const s = stamp();
    s.at = contentGeneration() + 1000;

    expect(cached('stale', s)).toBe(CACHE_DERIVED_CONTENT ? 'stale' : null);
  });
});

describe('currentMap', () => {
  it('starts empty, since a fresh stamp has built nothing yet', () => {
    const map = new Map([['stale', 1]]);

    expect(currentMap(map, stamp()).size).toBe(0);
  });

  it('keeps entries while the content is unchanged', () => {
    const map = new Map<string, number>();
    const s = stamp();

    currentMap(map, s).set('a', 1);
    expect(currentMap(map, s).get('a')).toBe(1);
  });

  it('empties the cache when it belongs to older content', () => {
    const map = new Map<string, number>();
    const s = stamp();
    currentMap(map, s).set('a', 1);

    s.at = contentGeneration() - 1;
    expect(currentMap(map, s).size).toBe(0);
  });
});

describe('memoisation across the derived getters', () => {
  // The point of the whole mechanism: a page render asks for these hundreds of
  // times, and each has to answer from memory rather than rebuild.
  it('hands back the same object every time within one generation', () => {
    expect(getContentRegistry()).toBe(getContentRegistry());
    expect(getUrlMap()).toBe(getUrlMap());
    expect(getLinkGraph()).toBe(getLinkGraph());
  });

  it('does not rebuild when asked repeatedly', () => {
    const first = getContentRegistry();

    for (let i = 0; i < 200; i += 1) {
      expect(getContentRegistry()).toBe(first);
    }
  });
});
