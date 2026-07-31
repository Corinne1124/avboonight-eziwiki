import { describe, it, expect } from 'vitest';
import { mergeDiscoveredDocs } from './auto';
import { extractAllPaths } from './builder';
import { getAllDocPaths, getDoc } from '../content/registry';
import { NavigationItem } from '../payload/types';

/** Finds a node anywhere in the tree by its display name. */
function findByName(items: NavigationItem[], name: string): NavigationItem | null {
  for (const item of items) {
    if (item.name === name) return item;
    if (item.children) {
      const found = findByName(item.children, name);
      if (found) return found;
    }
  }
  return null;
}

describe('mergeDiscoveredDocs', () => {
  it('builds the whole tree from content when nothing is curated', () => {
    const merged = mergeDiscoveredDocs([]);
    const paths = extractAllPaths(merged);

    const expected = getAllDocPaths().filter((path) => !getDoc(path)?.hidden);
    expect(paths.sort()).toEqual(expected.sort());
  });

  it('leaves curated entries untouched', () => {
    const curated: NavigationItem[] = [{ name: '🏠 Custom Intro Label', path: 'intro' }];
    const merged = mergeDiscoveredDocs(curated);

    expect(merged[0]).toMatchObject({ name: '🏠 Custom Intro Label', path: 'intro' });
  });

  it('does not duplicate a document the curated tree already references', () => {
    const merged = mergeDiscoveredDocs([{ name: 'Intro', path: 'intro' }]);
    const paths = extractAllPaths(merged);

    expect(paths.filter((path) => path === 'intro')).toHaveLength(1);
  });

  it('appends a discovered document to the curated section owning its directory', () => {
    const curated: NavigationItem[] = [
      {
        name: '📚 Getting Started',
        children: [{ name: 'Quick Start', path: 'getting-started/quick-start' }],
      },
    ];

    const section = findByName(mergeDiscoveredDocs(curated), '📚 Getting Started');
    const childPaths = section?.children?.map((child) => child.path) ?? [];

    // 'installation' and 'first-wiki' live in the same directory and were not
    // curated, so they should land inside the existing section.
    expect(childPaths).toContain('getting-started/quick-start');
    expect(childPaths).toContain('getting-started/installation');
    expect(childPaths).toContain('getting-started/first-wiki');
  });

  it('creates a section for a directory the curated tree does not cover', () => {
    const merged = mergeDiscoveredDocs([]);

    // The section is named by content/getting-started/_meta.json, so match on
    // the pages it holds rather than on a label that is content's to choose.
    const section = merged.find((item) =>
      item.children?.some((child) => child.path === 'getting-started/quick-start'),
    );

    expect(section?.children?.length).toBeGreaterThan(0);
    expect(section?.path).toBeUndefined();
  });

  it('takes a section name from the folder _meta.json', () => {
    const merged = mergeDiscoveredDocs([]);

    expect(findByName(merged, '📚 Getting Started')).not.toBeNull();
  });

  it('orders root pages and sections in one sequence', () => {
    const merged = mergeDiscoveredDocs([]);

    // intro.md declares order: 1 and the sections start at 2, so the root page
    // must come first rather than being pushed behind every folder.
    expect(merged[0].path).toBe('intro');
  });

  it('omits documents marked hidden in frontmatter', () => {
    const paths = extractAllPaths(mergeDiscoveredDocs([]));
    const hidden = getAllDocPaths().filter((path) => getDoc(path)?.hidden);

    for (const path of hidden) {
      expect(paths).not.toContain(path);
    }
  });

  it('does not mutate the curated tree it was given', () => {
    const curated: NavigationItem[] = [
      {
        name: 'Getting Started',
        children: [{ name: 'Quick Start', path: 'getting-started/quick-start' }],
      },
    ];
    const before = JSON.stringify(curated);

    mergeDiscoveredDocs(curated);

    expect(JSON.stringify(curated)).toBe(before);
  });

  it('places root-level documents at the top level', () => {
    const merged = mergeDiscoveredDocs([]);
    const rootPaths = merged.filter((item) => item.path).map((item) => item.path);

    expect(rootPaths).toContain('intro');
  });
});
