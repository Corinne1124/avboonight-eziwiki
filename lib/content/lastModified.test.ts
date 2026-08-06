import { describe, it, expect } from 'vitest';
import { resolveLastModified, getLastModified, getPublished } from './lastModified';

const COMMITTED = '2026-03-14T09:26:53+09:00';

describe('resolveLastModified', () => {
  it('falls back to the commit that last touched the file', () => {
    expect(resolveLastModified(undefined, COMMITTED)).toEqual({
      iso: COMMITTED,
      date: '2026-03-14',
      source: 'git',
    });
  });

  it('prefers a date the author declared', () => {
    expect(resolveLastModified(new Date('2026-01-02T00:00:00Z'), COMMITTED)).toEqual({
      iso: '2026-01-02T00:00:00.000Z',
      date: '2026-01-02',
      source: 'frontmatter',
    });
  });

  it('accepts a quoted date, which YAML leaves as a string', () => {
    const resolved = resolveLastModified('2026-01-02', undefined);

    expect(resolved?.date).toBe('2026-01-02');
    expect(resolved?.source).toBe('frontmatter');
  });

  it('keeps the day the author’s own clock showed', () => {
    // 08:00 in Seoul is the previous evening in UTC. Formatting the instant
    // would make the displayed day depend on where the site was built.
    const resolved = resolveLastModified(undefined, '2026-08-06T08:00:00+09:00');

    expect(resolved?.date).toBe('2026-08-06');
  });

  it('ignores an `updated` that names no instant', () => {
    expect(resolveLastModified('soon', COMMITTED)?.source).toBe('git');
    expect(resolveLastModified({ when: 'later' }, undefined)).toBeNull();
  });

  it('says nothing when neither source knows', () => {
    // A page written but not yet committed has no date, and inventing one —
    // the build time, say — would tell the reader the opposite of the truth.
    expect(resolveLastModified(undefined, undefined)).toBeNull();
  });
});

describe('getLastModified', () => {
  it('dates a committed page from its history', () => {
    const resolved = getLastModified('intro');

    expect(resolved?.source).toBe('git');
    expect(resolved?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(new Date(resolved!.iso).getTime())).toBe(false);
  });

  it('has nothing to say about a path with no document', () => {
    expect(getLastModified('nowhere/at-all')).toBeNull();
  });
});

describe('getPublished', () => {
  it('is absent unless the page declares it', () => {
    // The first commit is when a file entered the repository, which for an
    // imported vault is not when the page was written.
    expect(getPublished('intro')).toBeNull();
  });
});
