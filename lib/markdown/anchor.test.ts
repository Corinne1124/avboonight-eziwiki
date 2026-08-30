import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './render';

// Authors coming from Obsidian write the heading's text after the `#`; the
// id the page carries is the slug of that text, and the link has to reach it
// either way.
describe('wiki link anchors', () => {
  it('slugs a heading written as text', async () => {
    const { html } = await renderMarkdown('[[intro#Quick Start]]\n');

    expect(html).toMatch(/href="[^"]*#quick-start"/);
  });

  it('leaves a slug as it is', async () => {
    const { html } = await renderMarkdown('[[intro#quick-start]]\n');

    expect(html).toMatch(/href="[^"]*#quick-start"/);
  });

  it('slugs an anchor within the page', async () => {
    const { html } = await renderMarkdown('[[#설치 방법]]\n');
    const href = /href="([^"]*)"/.exec(html)?.[1] ?? '';

    // Serialised percent-encoded, which the browser decodes before looking
    // the id up; the slug underneath is what matters.
    expect(decodeURIComponent(href)).toBe('#설치-방법');
  });
});

// A section include names a heading, and the heading's id is the one the
// rendered page carries — which is not the slug of the raw source when the
// heading holds a wiki link or HTML.
describe('section includes', () => {
  it('finds a section by the heading text as written', async () => {
    const { html } = await renderMarkdown('![[intro#从这里开始]]\n');

    expect(html).toContain('从这里开始');
    expect(html).not.toContain('功能一览');
  });

  it('finds the same section by its id', async () => {
    const { html } = await renderMarkdown('![[intro#从这里开始]]\n');

    expect(html).toContain('从这里开始');
  });
});
