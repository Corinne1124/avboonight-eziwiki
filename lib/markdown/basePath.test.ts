import { describe, expect, it } from 'vitest';
import type { Element, Root } from 'hast';
import { rehypeBasePath } from './rehype-plugins';

/** Runs the plugin over one element and returns its properties afterwards. */
function rewrite(tagName: string, properties: Element['properties']): Element['properties'] {
  const element: Element = { type: 'element', tagName, properties, children: [] };
  const tree: Root = { type: 'root', children: [element] };

  rehypeBasePath('/wiki')(tree);

  return element.properties;
}

describe('rehypeBasePath', () => {
  it('prefixes links and images', () => {
    expect(rewrite('a', { href: '/guides/x/' }).href).toBe('/wiki/guides/x/');
    expect(rewrite('img', { src: '/a.png' }).src).toBe('/wiki/a.png');
  });

  it('leaves anchors, protocol-relative and already-prefixed URLs alone', () => {
    expect(rewrite('a', { href: '#top' }).href).toBe('#top');
    expect(rewrite('a', { href: '//cdn.example.com/x' }).href).toBe('//cdn.example.com/x');
    expect(rewrite('a', { href: '/wiki/guides/x/' }).href).toBe('/wiki/guides/x/');
  });

  // Raw HTML is the one way to embed a video or a frame, and everything but
  // `a[href]` and `img[src]` used to keep pointing at the domain root.
  it('prefixes the media and frame attributes raw HTML carries', () => {
    const video = rewrite('video', { src: '/m/a.mp4', poster: '/m/a.jpg' });
    expect(video.src).toBe('/wiki/m/a.mp4');
    expect(video.poster).toBe('/wiki/m/a.jpg');

    expect(rewrite('source', { src: '/m/a.webm' }).src).toBe('/wiki/m/a.webm');
    expect(rewrite('iframe', { src: '/embed/' }).src).toBe('/wiki/embed/');
    expect(rewrite('object', { data: '/doc.pdf' }).data).toBe('/wiki/doc.pdf');
  });

  it('prefixes every candidate of a srcset', () => {
    expect(rewrite('img', { srcSet: '/a.png 1x, /b.png 2x' }).srcSet).toBe(
      '/wiki/a.png 1x, /wiki/b.png 2x',
    );
  });
});
