import { describe, it, expect } from 'vitest';
import { getBreadcrumbTrail } from './breadcrumb';
import type { NavigationItem } from '../payload/types';

const NAVIGATION: NavigationItem[] = [
  { name: 'Intro', path: 'intro' },
  {
    name: 'Guides',
    children: [
      { name: 'Setup', path: 'guides/setup' },
      { name: 'Deep', children: [{ name: 'Inner', path: 'guides/deep/inner' }] },
    ],
  },
];

describe('getBreadcrumbTrail', () => {
  it('finds a page at the top level', () => {
    expect(getBreadcrumbTrail(NAVIGATION, 'intro')).toEqual([{ name: 'Intro', path: 'intro' }]);
  });

  it('carries the sections a page sits under', () => {
    expect(getBreadcrumbTrail(NAVIGATION, 'guides/setup')).toEqual([
      { name: 'Guides', path: undefined },
      { name: 'Setup', path: 'guides/setup' },
    ]);
  });

  it('descends as far as the tree goes', () => {
    expect(getBreadcrumbTrail(NAVIGATION, 'guides/deep/inner')?.map((c) => c.name)).toEqual([
      'Guides',
      'Deep',
      'Inner',
    ]);
  });

  it('returns null for a page the navigation does not contain', () => {
    // A hidden page is reachable by link but absent from the tree, and gets no
    // trail rather than one invented from its URL.
    expect(getBreadcrumbTrail(NAVIGATION, 'secret')).toBeNull();
  });

  it('does not leak the trail between sibling branches', () => {
    // The walk accumulates as it descends; a branch that fails must not leave
    // its own steps behind for the next one.
    const trail = getBreadcrumbTrail(
      [{ name: 'A', children: [{ name: 'dead', path: 'a/dead' }] }, ...NAVIGATION],
      'intro',
    );

    expect(trail).toEqual([{ name: 'Intro', path: 'intro' }]);
  });
});
