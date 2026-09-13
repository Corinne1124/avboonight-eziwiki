import { describe, it, expect } from 'vitest';
import {
  RESERVED_SEGMENTS,
  candidateFilesFor,
  checkPagePath,
  filePathFor,
  pagePathForFile,
  suggestPagePath,
} from './paths';
import { RESERVED_SEGMENTS as ROUTE_SEGMENTS } from '../navigation/routes';

describe('suggestPagePath', () => {
  it('lower-cases and hyphenates the way the wiki names files', () => {
    expect(suggestPagePath('Quick Start')).toBe('quick-start');
    expect(suggestPagePath('guides/Setup Now')).toBe('guides/setup-now');
  });

  it('keeps letters outside ASCII, which a wiki writes its files in too', () => {
    expect(suggestPagePath('艾兰')).toBe('艾兰');
    expect(suggestPagePath('아이란')).toBe('아이란');
  });
});

describe('checkPagePath', () => {
  it('accepts an ordinary page path', () => {
    expect(checkPagePath('guides/setup')).toEqual({
      ok: true,
      target: { path: 'guides/setup', folderPage: false },
    });
  });

  it('tolerates the punctuation people type around a path', () => {
    expect(checkPagePath('/guides/setup.md/')).toEqual({
      ok: true,
      target: { path: 'guides/setup', folderPage: true },
    });
  });

  it('reads a trailing slash as a folder page', () => {
    expect(checkPagePath('ailan/')).toEqual({
      ok: true,
      target: { path: 'ailan', folderPage: true },
    });
  });

  it('reads a named index as a folder page', () => {
    expect(checkPagePath('ailan/index')).toEqual({
      ok: true,
      target: { path: 'ailan', folderPage: true },
    });
    expect(checkPagePath('ailan/index.md')).toEqual({
      ok: true,
      target: { path: 'ailan', folderPage: true },
    });
  });

  it('treats a root-level index as a page of its own', () => {
    // There is no folder for it to stand for, and `content/index.md` is an
    // ordinary page at /index.
    expect(checkPagePath('index')).toEqual({
      ok: true,
      target: { path: 'index', folderPage: false },
    });
  });

  it('keeps spaces, which the content already carries', () => {
    expect(checkPagePath('AE - ASKARSE')).toEqual({
      ok: true,
      target: { path: 'AE - ASKARSE', folderPage: false },
    });
  });

  it('refuses an empty path', () => {
    expect(checkPagePath('   ')).toEqual({ ok: false, problem: 'empty' });
    expect(checkPagePath('/')).toEqual({ ok: false, problem: 'empty' });
  });

  it('refuses the segments the app keeps for its own views', () => {
    expect(checkPagePath('graph')).toEqual({ ok: false, problem: 'reserved' });
    expect(checkPagePath('tags/鬼')).toEqual({ ok: false, problem: 'reserved' });
  });

  it('refuses underscored and dotted names, which are never published', () => {
    expect(checkPagePath('_drafts/idea')).toEqual({ ok: false, problem: 'draft' });
    expect(checkPagePath('.hidden')).toEqual({ ok: false, problem: 'draft' });
  });

  it('refuses paths that leave the content directory or break a URL', () => {
    expect(checkPagePath('../../etc/passwd')).toEqual({ ok: false, problem: 'invalid' });
    expect(checkPagePath('a/./b')).toEqual({ ok: false, problem: 'invalid' });
    expect(checkPagePath('a?b')).toEqual({ ok: false, problem: 'invalid' });
    expect(checkPagePath('a:b')).toEqual({ ok: false, problem: 'invalid' });
  });

  it('agrees with the routes module about what is reserved', () => {
    // The client cannot import `lib/navigation/routes.ts` — it reads the
    // content registry — so the list is duplicated and this is what keeps the
    // two copies honest.
    expect(RESERVED_SEGMENTS).toEqual(ROUTE_SEGMENTS);
  });
});

describe('file paths', () => {
  it('maps a page to the file that holds it', () => {
    expect(filePathFor({ path: 'guides/setup', folderPage: false })).toBe(
      'content/guides/setup.md',
    );
    expect(filePathFor({ path: 'ailan', folderPage: true })).toBe('content/ailan/index.md');
  });

  it('offers both conventions when only the canonical path is known', () => {
    expect(candidateFilesFor('ailan')).toEqual(['content/ailan.md', 'content/ailan/index.md']);
    expect(candidateFilesFor('/ailan/')).toEqual(['content/ailan.md', 'content/ailan/index.md']);
    expect(candidateFilesFor('')).toEqual([]);
  });

  it('reads a canonical path back out of a file path', () => {
    expect(pagePathForFile('content/ailan/index.md')).toBe('ailan');
    expect(pagePathForFile('content/guides/setup.md')).toBe('guides/setup');
    expect(pagePathForFile('public/images/a.png')).toBeNull();
  });
});
