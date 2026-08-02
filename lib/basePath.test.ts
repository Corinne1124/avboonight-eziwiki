import { describe, it, expect, afterEach, vi } from 'vitest';

/**
 * Loads the module with a given deployment environment.
 *
 * The base path is read once at import time — it cannot change during a build
 * — so exercising a different deployment means re-importing rather than
 * reassigning.
 *
 * @param env - Values for the deployment variables
 * @returns The freshly imported module
 */
async function load(env: { basePath?: string }) {
  vi.resetModules();
  process.env.NEXT_PUBLIC_BASE_PATH = env.basePath ?? '';
  return import('./basePath');
}

afterEach(() => {
  delete process.env.NEXT_PUBLIC_BASE_PATH;
});

describe('asset', () => {
  it('leaves public paths alone when served from the root', async () => {
    const { asset } = await load({});
    expect(asset('/favicon.svg')).toBe('/favicon.svg');
  });

  it('prefixes public paths with the base path', async () => {
    const { asset } = await load({ basePath: '/eziwiki' });
    expect(asset('/favicon.svg')).toBe('/eziwiki/favicon.svg');
    expect(asset('/fonts/SUITE/SUITE-Regular.woff2')).toBe(
      '/eziwiki/fonts/SUITE/SUITE-Regular.woff2',
    );
  });

  it('leaves absolute and protocol-relative URLs untouched', async () => {
    const { asset } = await load({ basePath: '/eziwiki' });
    expect(asset('https://cdn.example.com/logo.svg')).toBe('https://cdn.example.com/logo.svg');
    expect(asset('//cdn.example.com/logo.svg')).toBe('//cdn.example.com/logo.svg');
  });
});
