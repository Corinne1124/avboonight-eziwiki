import { describe, it, expect } from 'vitest';
import {
  composeDocument,
  getField,
  parseDocument,
  parseListField,
  renderDocument,
  setField,
} from './frontmatter';

describe('parseDocument', () => {
  it('splits a simple block into entries and a body', () => {
    const doc = parseDocument('---\ntitle: Quick Start\norder: 2\n---\n\n# Hello\n');

    expect(doc.hasFrontmatter).toBe(true);
    expect(doc.simple).toBe(true);
    expect(doc.entries.map((entry) => entry.key)).toEqual(['title', 'order']);
    expect(getField(doc, 'title')).toBe('Quick Start');
    expect(getField(doc, 'order')).toBe(2);
    expect(doc.body).toBe('\n# Hello\n');
  });

  it('keeps a quoted value whole, colons and all', () => {
    const doc = parseDocument('---\ntitle: "Setup: The Basics"\n---\n\nBody\n');

    expect(getField(doc, 'title')).toBe('Setup: The Basics');
  });

  it('reads both shapes of list', () => {
    const inline = parseDocument('---\ntags: [deployment, hosting]\n---\n');
    const block = parseDocument('---\ntags:\n  - deployment\n  - hosting\n---\n');

    expect(getField(inline, 'tags')).toEqual(['deployment', 'hosting']);
    expect(getField(block, 'tags')).toEqual(['deployment', 'hosting']);
  });

  it('keeps commas inside a quoted item', () => {
    const doc = parseDocument('---\ntags: ["a, b", c]\n---\n');

    expect(getField(doc, 'tags')).toEqual(['a, b', 'c']);
  });

  it('reads booleans and keeps unknown keys verbatim', () => {
    const doc = parseDocument('---\nhidden: true\ncustom-key: keep me\n---\n');

    expect(getField(doc, 'hidden')).toBe(true);
    expect(doc.simple).toBe(true);
    expect(doc.entries.find((entry) => entry.key === 'custom-key')?.editable).toBe(false);
    expect(renderDocument(doc)).toContain('custom-key: keep me');
  });

  it('keeps comments and blank lines where they were', () => {
    const source = '---\n# a note\ntitle: Kept\n\norder: 1\n---\n\nBody\n';
    const doc = parseDocument(source);

    expect(renderDocument(doc)).toBe(source);
  });

  it('reports a block it cannot follow as not simple', () => {
    const nested = parseDocument('---\nseo:\n  title: Nested\n---\n');
    const inlineMap = parseDocument('---\nseo: { title: Nested }\n---\n');
    const colon = parseDocument('---\ntitle: Setup: The Basics\n---\n');

    expect(nested.simple).toBe(false);
    expect(inlineMap.simple).toBe(false);
    expect(colon.simple).toBe(false);
    // Nothing is lost either way: the lines are still rendered back out.
    expect(renderDocument(nested)).toContain('  title: Nested');
  });

  it('treats a file with no frontmatter as all body', () => {
    const doc = parseDocument('# Just a page\n');

    expect(doc.hasFrontmatter).toBe(false);
    expect(doc.entries).toEqual([]);
    expect(doc.body).toBe('# Just a page\n');
    expect(doc.simple).toBe(true);
  });
});

describe('setField', () => {
  it('rewrites a key where it stands', () => {
    const doc = setField(parseDocument('---\ntitle: Old\norder: 3\n---\nBody\n'), 'title', 'New');

    expect(renderDocument(doc)).toBe('---\ntitle: New\norder: 3\n---\n\nBody\n');
  });

  it('quotes a value that would otherwise parse as structure', () => {
    const doc = setField(parseDocument('---\ntitle: Old\n---\n'), 'title', 'Setup: The Basics');

    expect(renderDocument(doc)).toContain('title: "Setup: The Basics"');
  });

  it('places a new key among the fields it belongs with', () => {
    const doc = setField(parseDocument('---\ntitle: Kept\n# a note\n---\n'), 'tags', ['a', 'b']);

    expect(renderDocument(doc)).toBe('---\ntitle: Kept\ntags: [a, b]\n# a note\n---\n');
  });

  it('removes a field when given nothing', () => {
    const doc = setField(
      parseDocument('---\ntitle: Kept\nhidden: true\n---\n'),
      'hidden',
      undefined,
    );

    expect(renderDocument(doc)).not.toContain('hidden');
  });

  it('writes lists back in the shape the wiki reads', () => {
    const doc = setField(parseDocument('---\ntitle: Kept\n---\n'), 'aliases', ['guides/setup']);

    expect(renderDocument(doc)).toContain('aliases: [guides/setup]');
  });
});

describe('composeDocument', () => {
  it('builds a new page with the fields it was given', () => {
    const source = composeDocument({ title: '艾兰', order: 3 }, '# 艾兰\n\n内容\n');

    expect(source).toBe('---\ntitle: 艾兰\norder: 3\n---\n\n# 艾兰\n\n内容\n');
  });

  it('writes fields in a fixed order, whatever order they were given', () => {
    const source = composeDocument({ tags: ['a'], title: 'T', description: 'D' }, 'Body\n');

    expect(source.indexOf('title:')).toBeLessThan(source.indexOf('description:'));
    expect(source.indexOf('description:')).toBeLessThan(source.indexOf('tags:'));
  });

  it('omits empty values rather than writing blank keys', () => {
    const source = composeDocument({ title: 'T', description: '', order: undefined }, 'Body\n');

    expect(source).toBe('---\ntitle: T\n---\n\nBody\n');
  });
});

describe('parseListField', () => {
  it('reads a comma-separated field', () => {
    expect(parseListField(' a, b ,, c ')).toEqual(['a', 'b', 'c']);
    expect(parseListField('')).toEqual([]);
  });
});
