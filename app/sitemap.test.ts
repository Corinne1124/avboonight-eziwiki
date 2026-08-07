import { describe, it, expect } from 'vitest';
import sitemap from './sitemap';
import { getLastModified } from '@/lib/content/lastModified';
import { getSite } from '@/lib/site';
import { docPathToUrl } from '@/lib/navigation/url';
import { pageUrl } from '@/lib/basePath';

const entries = sitemap();

describe('sitemap', () => {
  it('lists the home page, every visible document, and the tag index', () => {
    const { docPaths, hiddenPaths } = getSite();
    const visible = docPaths.filter((path) => !hiddenPaths.has(path));

    expect(entries.length).toBeGreaterThan(visible.length);
    expect(entries.map((entry) => entry.url)).toContain(pageUrl('tags', getSite().global.baseUrl));
  });

  it('leaves hidden pages out', () => {
    const { urlMap, global, hiddenPaths } = getSite();
    const urls = new Set(entries.map((entry) => entry.url));

    for (const path of hiddenPaths) {
      const url = docPathToUrl(urlMap, path);
      if (url) expect(urls.has(pageUrl(url, global.baseUrl))).toBe(false);
    }
  });

  it('dates each page from its own history, not from the build', () => {
    // Every page carrying the moment the site was last published is the same
    // as carrying nothing: a crawler that finds the date moved but the page
    // unchanged learns to stop believing the field.
    const { urlMap, global, docPaths, hiddenPaths } = getSite();
    const byUrl = new Map(entries.map((entry) => [entry.url, entry.lastModified]));

    let checked = 0;

    for (const path of docPaths) {
      if (hiddenPaths.has(path)) continue;

      const url = docPathToUrl(urlMap, path);
      const expected = getLastModified(path);
      if (!url || !expected) continue;

      expect(byUrl.get(pageUrl(url, global.baseUrl))).toEqual(new Date(expected.iso));
      checked += 1;
    }

    expect(checked, 'no dated page to check against').toBeGreaterThan(0);
  });

  it('does not stamp every entry with one date', () => {
    const stamps = new Set(
      entries.flatMap((entry) => (entry.lastModified ? [String(entry.lastModified)] : [])),
    );

    expect(stamps.size).toBeGreaterThan(1);
  });

  it('dates an index page from the newest thing it lists', () => {
    // The front page's own file barely changes while what it lists changes
    // underneath it, so its history is not the story.
    const home = entries.find((entry) => entry.priority === 1);
    const newest = Math.max(
      ...entries.flatMap((entry) =>
        entry.priority === 0.8 && entry.lastModified
          ? [new Date(entry.lastModified).getTime()]
          : [],
      ),
    );

    expect(new Date(home!.lastModified!).getTime()).toBe(newest);
  });
});
