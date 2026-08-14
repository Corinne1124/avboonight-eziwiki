import { describe, it, expect } from 'vitest';
import { matchesAny } from './glob';

describe('matchesAny', () => {
  it('matches nothing when there are no patterns', () => {
    expect(matchesAny('scans/a.pdf')).toBe(false);
    expect(matchesAny('scans/a.pdf', [])).toBe(false);
  });

  it('matches a literal path', () => {
    expect(matchesAny('documents/sample.pdf', ['documents/sample.pdf'])).toBe(true);
    expect(matchesAny('documents/other.pdf', ['documents/sample.pdf'])).toBe(false);
  });

  it('anchors the whole path rather than searching within it', () => {
    expect(matchesAny('other/scans/a.pdf', ['scans/**'])).toBe(false);
    expect(matchesAny('scans/a.pdf.bak', ['scans/*.pdf'])).toBe(false);
  });

  it('spans directories with **', () => {
    expect(matchesAny('scans/a.pdf', ['scans/**'])).toBe(true);
    expect(matchesAny('scans/1985/march/a.pdf', ['scans/**'])).toBe(true);
  });

  // A leading `**/` has to match no directories at all, or a pattern meant to
  // cover every PDF would skip the ones sitting at the root.
  it('lets a leading **/ match a file at the root', () => {
    expect(matchesAny('a.pdf', ['**/*.pdf'])).toBe(true);
    expect(matchesAny('x/y/a.pdf', ['**/*.pdf'])).toBe(true);
  });

  it('keeps * inside one path segment', () => {
    expect(matchesAny('scans/a.pdf', ['scans/*.pdf'])).toBe(true);
    expect(matchesAny('scans/1985/a.pdf', ['scans/*.pdf'])).toBe(false);
  });

  it('matches one character with ?', () => {
    expect(matchesAny('scans/a1.pdf', ['scans/a?.pdf'])).toBe(true);
    expect(matchesAny('scans/a12.pdf', ['scans/a?.pdf'])).toBe(false);
  });

  it('takes a dot literally rather than as any character', () => {
    expect(matchesAny('scansXa.pdf', ['scans.a.pdf'])).toBe(false);
    expect(matchesAny('scans.a.pdf', ['scans.a.pdf'])).toBe(true);
  });

  it('ignores case, since the same directory is spelled either way', () => {
    expect(matchesAny('Scans/A.PDF', ['scans/*.pdf'])).toBe(true);
  });

  it('ignores a leading slash on either side', () => {
    expect(matchesAny('/scans/a.pdf', ['scans/**'])).toBe(true);
    expect(matchesAny('scans/a.pdf', ['/scans/**'])).toBe(true);
  });

  it('matches when any one pattern does', () => {
    expect(matchesAny('archive/a.pdf', ['scans/**', 'archive/**'])).toBe(true);
  });

  // The expansion of `*` contains a `*`; expanding tokens one pass at a time
  // would find it again and let a single star cross directories.
  it('does not re-expand what a wildcard expanded to', () => {
    expect(matchesAny('scans/deep/a.pdf', ['scans/*'])).toBe(false);
  });
});
