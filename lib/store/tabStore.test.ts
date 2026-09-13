import { describe, it, expect } from 'vitest';
import { migrateTabState, useTabStore } from './tabStore';

describe('the sidebar on a first visit', () => {
  it('starts collapsed', () => {
    expect(useTabStore.getState().sidebarCollapsed).toBe(true);
  });

  it('still offers a way back to the full tree', () => {
    // Collapsed is a rail, not a hidden panel: the store keeps the width the
    // sidebar expands to, so the toggle restores what the reader had.
    expect(useTabStore.getState().sidebarWidth).toBeGreaterThan(100);
  });
});

describe('migrateTabState', () => {
  it('adopts the collapsed default for a store written before it', () => {
    const migrated = migrateTabState(
      { tabs: [], activeTabId: null, sidebarWidth: 320, sidebarCollapsed: false },
      1,
    ) as Record<string, unknown>;

    expect(migrated.sidebarCollapsed).toBe(true);
    // Everything else the reader had chosen is left alone.
    expect(migrated.sidebarWidth).toBe(320);
  });

  it('leaves a choice made under the current version as it is', () => {
    const migrated = migrateTabState({ tabs: [], sidebarCollapsed: false }, 2) as Record<
      string,
      unknown
    >;

    expect(migrated.sidebarCollapsed).toBe(false);
  });

  it('gives a tab that carries no history one to stand on', () => {
    const migrated = migrateTabState(
      { tabs: [{ id: 'tab-1', title: 'Home', path: 'intro' }] },
      0,
    ) as { tabs: Array<{ history: unknown[]; historyIndex: number }> };

    expect(migrated.tabs[0].history).toEqual([{ path: 'intro', title: 'Home' }]);
    expect(migrated.tabs[0].historyIndex).toBe(0);
  });

  it('converts the old string-array history', () => {
    const migrated = migrateTabState(
      { tabs: [{ title: 'Page', path: 'b', history: ['a', 'b'], historyIndex: 1 }] },
      0,
    ) as { tabs: Array<{ history: Array<{ path: string; title: string }> }> };

    expect(migrated.tabs[0].history).toEqual([
      { path: 'a', title: 'Page' },
      { path: 'b', title: 'Page' },
    ]);
  });

  it('clamps an index that points past the history', () => {
    const migrated = migrateTabState(
      {
        tabs: [
          {
            title: 'Page',
            path: 'a',
            history: [{ path: 'a', title: 'Page' }],
            historyIndex: 7,
          },
        ],
      },
      0,
    ) as { tabs: Array<{ historyIndex: number }> };

    expect(migrated.tabs[0].historyIndex).toBe(0);
  });

  it('hands back anything that is not a stored state untouched', () => {
    expect(migrateTabState(null, 1)).toBeNull();
    expect(migrateTabState('nonsense', 1)).toBe('nonsense');
  });
});
