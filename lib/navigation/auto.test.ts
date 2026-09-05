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

/** Finds the section that holds a given page, at any depth. */
function findSectionContaining(items: NavigationItem[], path: string): NavigationItem | null {
  for (const item of items) {
    if (item.children?.some((child) => child.path === path)) return item;
    if (item.children) {
      const found = findSectionContaining(item.children, path);
      if (found) return found;
    }
  }
  return null;
}

/** Finds a navigation node by the content path it publishes, at any depth. */
function findByPath(items: NavigationItem[], path: string): NavigationItem | null {
  for (const item of items) {
    if (item.path === path) return item;
    if (item.children) {
      const found = findByPath(item.children, path);
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
        children: [{ name: 'Quick Start', path: 'example/getting-started/quick-start' }],
      },
    ];

    const section = findByName(mergeDiscoveredDocs(curated), '📚 Getting Started');
    const childPaths = section?.children?.map((child) => child.path) ?? [];

    // 'installation' and 'first-wiki' live in the same directory and were not
    // curated, so they should land inside the existing section.
    expect(childPaths).toContain('example/getting-started/quick-start');
    expect(childPaths).toContain('example/getting-started/installation');
    expect(childPaths).toContain('example/getting-started/first-wiki');
  });

  it('creates a section for a directory the curated tree does not cover', () => {
    const merged = mergeDiscoveredDocs([]);

    // The section is named by content/example/getting-started/_meta.json, so
    // match on the pages it holds rather than on a label that is content's to
    // choose. It sits under the `example` section, hence the recursive search.
    const section = findSectionContaining(merged, 'example/getting-started/quick-start');

    expect(section?.children?.length).toBeGreaterThan(0);
    expect(section?.path).toBeUndefined();
  });

  it('takes a section name from the folder _meta.json', () => {
    const merged = mergeDiscoveredDocs([]);

    expect(findByName(merged, '📚 快速入门')).not.toBeNull();
  });

  it('orders root pages and sections in one sequence', () => {
    const merged = mergeDiscoveredDocs([]);

    // jiye.md declares order: 1 and the sections start at 2, so the root page
    // must come first rather than being pushed behind every folder.
    expect(merged[0].path).toBe('jiye');
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

    expect(rootPaths).toContain('jiye');
  });

  it('publishes a folder with index.md as a page holding its siblings', () => {
    const node = findByPath(mergeDiscoveredDocs([]), 'example/folder-demo');

    expect(node).not.toBeNull();
    const childPaths = node?.children?.map((child) => child.path) ?? [];
    expect(childPaths).toContain('example/folder-demo/branch');
    expect(childPaths).toContain('example/folder-demo/second');
    // The page must not also appear among its own children.
    expect(childPaths).not.toContain('example/folder-demo');
  });

  it('keeps the folder page once in the tree', () => {
    const paths = extractAllPaths(mergeDiscoveredDocs([]));

    expect(paths.filter((path) => path === 'example/folder-demo')).toHaveLength(1);
  });

  it('nests folder pages recursively', () => {
    const node = findByPath(mergeDiscoveredDocs([]), 'example/folder-demo/deeper');

    expect(node).not.toBeNull();
    expect(node?.children?.map((child) => child.path)).toContain('example/folder-demo/deeper/leaf');
  });

  it('keeps the folder presentation on the page node', () => {
    const node = findByPath(mergeDiscoveredDocs([]), 'example/folder-demo');

    // The folder's `_meta.json` hides it from the sidebar...
    expect(node?.hidden).toBe(true);
    // ...and the page's own title and icon fill in what the folder does not
    // declare.
    expect(node?.name).toBe('文件夹页面演示');
    expect(node?.icon).toBe('📁');
  });

  it('keeps a folder holding only index.md an ordinary leaf page', () => {
    const node = findByPath(mergeDiscoveredDocs([]), 'example/solo-demo');

    expect(node).not.toBeNull();
    expect(node?.path).toBe('example/solo-demo');
    expect(node?.children).toBeUndefined();
    expect(node?.name).toBe('独立目录页示例');
  });

  it('publishes only the folder page when x.md and x/index.md both exist', () => {
    const merged = mergeDiscoveredDocs([]);
    const node = findByPath(merged, 'example/precedence');

    expect(node).not.toBeNull();
    expect(node?.name).toBe('目录页优先示例');
    expect(extractAllPaths(merged).filter((path) => path === 'example/precedence')).toHaveLength(1);
  });
});
