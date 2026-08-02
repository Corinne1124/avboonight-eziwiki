import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Rendering under the `hash` URL strategy.
 *
 * Kept apart from `render.test.ts` because the strategy is read from the
 * payload at module load and memoised, so exercising the other one means
 * mocking the config and re-importing. The tests here cover what the two
 * strategies do differently rather than repeating the shared behaviour.
 */

vi.mock('@/payload/config', async () => {
  const actual = await vi.importActual<typeof import('@/payload/config')>('@/payload/config');
  return {
    ...actual,
    payload: {
      ...actual.payload,
      global: { ...actual.payload.global, urlStrategy: 'hash' },
    },
  };
});

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.resetModules();
});

describe('hash URL strategy', () => {
  it('addresses pages by digest rather than by content path', async () => {
    const { renderMarkdown } = await import('./render');
    const { html } = await renderMarkdown('[Quick Start](getting-started/quick-start)\n');

    const href = html.match(/href="([^"]*)"/)?.[1] ?? '';

    expect(href).toMatch(/^\/[0-9a-f]{8}-[0-9a-f]{8}-[0-9a-f]{8}\/$/);
    expect(href).not.toContain('quick-start');
  });

  // A digest does not map back to a content path, so the plugin that adds the
  // trailing slash to ordinary internal links cannot resolve one of these. The
  // slash therefore has to come from the wiki-link resolver itself, or every
  // wiki link on a hash-addressed site costs a redirect.
  it('emits wiki links with the trailing slash the export uses', async () => {
    const { renderMarkdown } = await import('./render');
    const { html } = await renderMarkdown('[[quick-start]]\n');

    const href = html.match(/href="([^"]*)"/)?.[1] ?? '';

    expect(href).toMatch(/^\/[0-9a-f]{8}-[0-9a-f]{8}-[0-9a-f]{8}\/$/);
  });

  it('keeps the anchor when a wiki link carries one', async () => {
    const { renderMarkdown } = await import('./render');
    const { html } = await renderMarkdown('[[quick-start#prerequisites]]\n');

    const href = html.match(/href="([^"]*)"/)?.[1] ?? '';

    expect(href).toMatch(/^\/[0-9a-f-]+\/#prerequisites$/);
  });
});
