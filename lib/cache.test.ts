import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  CACHE_DERIVED_CONTENT,
  CONTENT_DIR,
  cached,
  currentMap,
  sourceSignature,
  stamp,
  contentGeneration,
} from './cache';
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

describe('sourceSignature', () => {
  // The build steps run in their own processes, so they cannot share the
  // generation above: they record this string and compare it on the next run.
  // What makes that sound is that it is a statement about the sources alone.
  it('answers the same thing twice for an unchanged tree', () => {
    expect(sourceSignature()).toBe(sourceSignature());
  });

  it('moves when a source file appears', () => {
    // Not a dot-file: the walk skips those, and the point here is a file the
    // wiki would publish.
    const probe = path.join(CONTENT_DIR, 'signature-probe.md');
    const before = sourceSignature();

    try {
      fs.writeFileSync(probe, '# Probe\n', 'utf-8');
      expect(sourceSignature()).not.toBe(before);
    } finally {
      fs.rmSync(probe, { force: true });
    }

    expect(sourceSignature()).toBe(before);
  });

  it('ignores the files the build itself writes', () => {
    // Otherwise every step would invalidate itself on the run that produced
    // its output, and nothing would ever be current.
    const generated = path.join(process.cwd(), 'public', 'search-index.json');

    if (!fs.existsSync(generated)) return;

    const before = sourceSignature();
    const original = fs.readFileSync(generated, 'utf-8');

    try {
      fs.writeFileSync(generated, `${original} `, 'utf-8');
      expect(sourceSignature()).toBe(before);
    } finally {
      fs.writeFileSync(generated, original, 'utf-8');
    }

    expect(sourceSignature()).toBe(before);
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
