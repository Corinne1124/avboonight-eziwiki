import { describe, expect, it } from 'vitest';
import { findRouteCollisions, isReservedUrl } from './routes';

describe('isReservedUrl', () => {
  it('claims the route itself and everything beneath it', () => {
    expect(isReservedUrl('graph')).toBe(true);
    expect(isReservedUrl('tags')).toBe(true);
    expect(isReservedUrl('tags/deployment')).toBe(true);
  });

  it('leaves a page that merely starts with the same letters alone', () => {
    expect(isReservedUrl('graphics')).toBe(false);
    expect(isReservedUrl('features/graph-and-backlinks')).toBe(false);
  });
});

// A page published at `/graph/` or `/tags/…` would be built and listed, and
// then answered by the app's own view instead.
describe('findRouteCollisions', () => {
  it('reports no collision in this wiki', () => {
    expect(findRouteCollisions()).toEqual([]);
  });
});
