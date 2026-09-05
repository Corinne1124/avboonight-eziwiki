import { describe, it, expect, beforeEach } from 'vitest';
import {
  clearRegistryCache,
  filePathOf,
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

    expect(paths).toContain('example/intro');
    expect(paths).toContain('example/getting-started/quick-start');
    expect(paths.every((path) => !path.endsWith('.md'))).toBe(true);
    expect(paths.every((path) => !path.startsWith('/'))).toBe(true);
  });

  it('reads the title from frontmatter', () => {
    expect(getDoc('example/getting-started/quick-start')?.title).toBe('快速入门');
  });

  it('splits the path into segments and a directory', () => {
    const doc = getDoc('example/getting-started/quick-start');

    expect(doc?.segments).toEqual(['example', 'getting-started', 'quick-start']);
    expect(doc?.dir).toBe('example/getting-started');
  });

  it('reports a root-level document as having no directory', () => {
    expect(getDoc('jiye')?.dir).toBe('');
  });

  it('strips the frontmatter block from the body', () => {
    const doc = getDoc('example/intro');

    // A `---` rule may still appear mid-document; what must be gone is the
    // leading frontmatter block and the keys it declared.
    expect(doc?.content.trimStart().startsWith('---')).toBe(false);
    expect(doc?.content).not.toContain('title: 欢迎使用 eziwiki');
    expect(doc?.frontmatter.title).toBe('欢迎使用 eziwiki');
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

  it('publishes a nested index.md as its folder', () => {
    const doc = getDoc('example/folder-demo');

    expect(doc).toBeDefined();
    expect(doc?.path).toBe('example/folder-demo');
    expect(doc?.indexDir).toBe('example/folder-demo');
    expect(doc?.dir).toBe('example');
    expect(doc?.title).toBe('文件夹页面演示');
    expect(doc?.filePath.replace(/\\/g, '/')).toMatch(/folder-demo\/index\.md$/);
  });

  it('nests folder pages as deeply as their directories do', () => {
    const doc = getDoc('example/folder-demo/deeper');

    expect(doc).toBeDefined();
    expect(doc?.path).toBe('example/folder-demo/deeper');
    expect(doc?.indexDir).toBe('example/folder-demo/deeper');
    expect(doc?.filePath.replace(/\\/g, '/')).toMatch(/deeper\/index\.md$/);
  });

  it('never lists the index filename as a page path', () => {
    const paths = getAllDocPaths();

    expect(paths).toContain('example/folder-demo');
    expect(paths).not.toContain('example/folder-demo/index');
  });

  it('resolves the physical file behind a page', () => {
    // A folder page lives at <folder>/index.md while publishing the folder.
    expect(filePathOf('example/folder-demo')).toBe('example/folder-demo/index.md');
    // An ordinary page's physical path is its canonical path plus the suffix.
    expect(filePathOf('example/intro')).toBe('example/intro.md');
  });

  it('lets a folder page supersede a plain file sharing its path', () => {
    const doc = getDoc('example/precedence');

    // content/example/precedence.md and content/example/precedence/index.md
    // both publish 'example/precedence'; the folder page renders and the old
    // flat file is not published at all.
    expect(doc).toBeDefined();
    expect(doc?.indexDir).toBe('example/precedence');
    expect(doc?.title).toBe('目录页优先示例');
    expect(doc?.filePath.replace(/\\/g, '/')).toMatch(/precedence\/index\.md$/);

    const publishing = getContentRegistry().docs.filter(
      (candidate) => candidate.path === 'example/precedence',
    );
    expect(publishing).toHaveLength(1);
    expect(publishing[0].filePath.replace(/\\/g, '/')).toMatch(/precedence\/index\.md$/);
  });
});
