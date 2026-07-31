import { describe, it, expect, beforeEach } from 'vitest';
import {
  clearRegistryCache,
  getAllDocPaths,
  getContentRegistry,
  getDoc,
  titleize,
} from './registry';

/**
 * These run against the repository's own `content/` directory rather than a
 * fixture, so they double as a check that the shipped content stays valid.
 */

describe('titleize', () => {
  it('turns file naming conventions into readable labels', () => {
    expect(titleize('quick-start')).toBe('Quick Start');
    expect(titleize('api_reference')).toBe('Api Reference');
    expect(titleize('intro')).toBe('Intro');
  });
});

describe('getContentRegistry', () => {
  beforeEach(clearRegistryCache);

  it('discovers every Markdown file under content/', () => {
    const { docs } = getContentRegistry();

    expect(docs.length).toBeGreaterThan(0);
    expect(docs.every((doc) => doc.filePath.endsWith('.md'))).toBe(true);
  });

  it('strips the extension and normalises the path', () => {
    const paths = getAllDocPaths();

    expect(paths).toContain('intro');
    expect(paths).toContain('getting-started/quick-start');
    expect(paths.every((path) => !path.endsWith('.md'))).toBe(true);
    expect(paths.every((path) => !path.startsWith('/'))).toBe(true);
  });

  it('reads the title from frontmatter', () => {
    expect(getDoc('getting-started/quick-start')?.title).toBe('Quick Start');
  });

  it('splits the path into segments and a directory', () => {
    const doc = getDoc('getting-started/quick-start');

    expect(doc?.segments).toEqual(['getting-started', 'quick-start']);
    expect(doc?.dir).toBe('getting-started');
  });

  it('reports a root-level document as having no directory', () => {
    expect(getDoc('intro')?.dir).toBe('');
  });

  it('strips the frontmatter block from the body', () => {
    const doc = getDoc('intro');

    // A `---` rule may still appear mid-document; what must be gone is the
    // leading frontmatter block and the keys it declared.
    expect(doc?.content.trimStart().startsWith('---')).toBe(false);
    expect(doc?.content).not.toContain('title: Welcome to eziwiki');
    expect(doc?.frontmatter.title).toBe('Welcome to eziwiki');
  });

  it('returns undefined for a path with no file', () => {
    expect(getDoc('does-not-exist')).toBeUndefined();
  });

  it('memoises the scan until the cache is cleared', () => {
    expect(getContentRegistry()).toBe(getContentRegistry());

    const before = getContentRegistry();
    clearRegistryCache();
    expect(getContentRegistry()).not.toBe(before);
  });

  it('sorts documents by order then title', () => {
    const { docs } = getContentRegistry();

    for (let i = 1; i < docs.length; i++) {
      const previous = docs[i - 1];
      const current = docs[i];

      if (previous.order === current.order) {
        expect(previous.title.localeCompare(current.title)).toBeLessThanOrEqual(0);
      } else {
        expect(previous.order).toBeLessThan(current.order);
      }
    }
  });
});
