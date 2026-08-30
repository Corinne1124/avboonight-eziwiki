import { describe, it, expect } from 'vitest';
import { getBacklinks, getLinkGraph, getLocalGraph } from './build';
import { getSite } from '../site';

describe('getLinkGraph', () => {
  it('includes every visible page as a node', () => {
    const { nodes } = getLinkGraph();
    const { docPaths, hiddenPaths } = getSite();

    expect(nodes).toHaveLength(docPaths.length - hiddenPaths.size);
  });

  it('excludes hidden pages from nodes and edges', () => {
    const { nodes, edges } = getLinkGraph();
    const { hiddenPaths } = getSite();

    expect(hiddenPaths.size).toBeGreaterThan(0);

    for (const hidden of hiddenPaths) {
      expect(nodes.some((node) => node.path === hidden)).toBe(false);
      expect(edges.some((edge) => edge.from === hidden || edge.to === hidden)).toBe(false);
    }
  });

  it('finds edges from ordinary Markdown links', () => {
    const { edges } = getLinkGraph();

    expect(edges.length).toBeGreaterThan(0);
  });

  it('keeps backlinks consistent with edges', () => {
    const { edges, backlinks } = getLinkGraph();

    for (const edge of edges) {
      expect(backlinks.get(edge.to)).toContain(edge.from);
    }

    for (const [target, sources] of backlinks) {
      for (const source of sources) {
        expect(edges.some((edge) => edge.from === source && edge.to === target)).toBe(true);
      }
    }
  });

  it('keeps outbound consistent with edges', () => {
    const { edges, outbound } = getLinkGraph();

    for (const edge of edges) {
      expect(outbound.get(edge.from)).toContain(edge.to);
    }
  });

  it('never records a page as linking to itself', () => {
    const { edges } = getLinkGraph();

    expect(edges.some((edge) => edge.from === edge.to)).toBe(false);
  });

  it('records no duplicate edges', () => {
    const { edges } = getLinkGraph();
    const keys = edges.map((edge) => `${edge.from}->${edge.to}`);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('gives degree matching the number of incident edges', () => {
    const { nodes, edges } = getLinkGraph();

    for (const node of nodes) {
      const incident = edges.filter(
        (edge) => edge.from === node.path || edge.to === node.path,
      ).length;

      expect(node.degree).toBe(incident);
    }
  });

  it('reports no unresolved links in the shipped content', () => {
    // The repository's own pages should not contain dangling references; this
    // is what makes the check meaningful as a build step.
    expect(getLinkGraph().broken).toEqual([]);
  });

  it('memoises the graph', () => {
    expect(getLinkGraph()).toBe(getLinkGraph());
  });
});

describe('getBacklinks', () => {
  it('returns the pages that link to a target', () => {
    const { edges } = getLinkGraph();
    const target = edges[0].to;

    const sources = getBacklinks(target).map((node) => node.path);
    expect(sources).toContain(edges[0].from);
  });

  it('returns an empty list for a page nothing links to', () => {
    expect(getBacklinks('does-not-exist')).toEqual([]);
  });

  it('sorts results by title', () => {
    const { backlinks } = getLinkGraph();
    const busiest = [...backlinks.entries()].sort((a, b) => b[1].length - a[1].length)[0];

    if (!busiest || busiest[1].length < 2) return;

    const titles = getBacklinks(busiest[0]).map((node) => node.title);
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
  });
});

describe('getLocalGraph', () => {
  it('centres on the page and includes its neighbours', () => {
    const { nodes } = getLocalGraph('example/features/wiki-links');

    expect(nodes.some((node) => node.path === 'example/features/wiki-links')).toBe(true);
    expect(nodes.length).toBeGreaterThan(1);
  });

  // A fan of unconnected dots would say less than the backlinks list already
  // does; the point is seeing how the neighbours relate to each other.
  it('keeps links between neighbours, not only those touching the page', () => {
    const { nodes, edges } = getLocalGraph('example/features/wiki-links');
    const paths = new Set(nodes.map((node) => node.path));

    expect(edges.length).toBeGreaterThan(0);
    expect(edges.every((edge) => paths.has(edge.from) && paths.has(edge.to))).toBe(true);
    expect(
      edges.some(
        (edge) =>
          edge.from !== 'example/features/wiki-links' && edge.to !== 'example/features/wiki-links',
      ),
    ).toBe(true);
  });

  it('stays within one link of the page', () => {
    const graph = getLinkGraph();
    const local = getLocalGraph('example/features/wiki-links');

    const neighbours = new Set([
      'example/features/wiki-links',
      ...(graph.outbound.get('example/features/wiki-links') ?? []),
      ...(graph.backlinks.get('example/features/wiki-links') ?? []),
    ]);

    expect(local.nodes.every((node) => neighbours.has(node.path))).toBe(true);
    expect(local.nodes.length).toBeLessThan(graph.nodes.length);
  });

  it('returns nothing for a page with no links either way', () => {
    expect(getLocalGraph('no/such/page')).toEqual({ nodes: [], edges: [] });
  });
});
