import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import type { Heading, Root } from 'mdast';
import { getDoc } from '../content/registry';
import { headingSlugs, headingText } from './headings';

function parse(markdown: string): Root {
  return unified().use(remarkParse).parse(markdown) as Root;
}

function heading(markdown: string): Heading {
  return parse(markdown).children[0] as Heading;
}

describe('headingText', () => {
  it('shows a labelled wiki link as its label', () => {
    expect(headingText(heading('## See [[quick-start|Alias]]'))).toBe('See Alias');
  });

  it('shows an unlabelled wiki link as the title of the page it reaches', () => {
    // `intro` is the one page both this repository and a scaffolded project
    // have, so the test travels with the engine.
    expect(headingText(heading('## See [[intro]]'))).toBe(`See ${getDoc('intro')?.title}`);
  });

  it('shows a link to nowhere as written', () => {
    expect(headingText(heading('## See [[no-such-page]]'))).toBe('See no-such-page');
  });

  it('drops inline HTML, as the render does', () => {
    expect(headingText(heading('## Setup <small>beta</small>'))).toBe('Setup beta');
  });
});

describe('headingSlugs', () => {
  it('ids headings as rehype-slug will, numbering repeats', () => {
    const tree = parse('# Intro\n\ntext\n\n## Intro\n\n### Deep [[x|Alias]]');

    expect(headingSlugs(tree.children)).toEqual([
      { index: 0, depth: 1, slug: 'intro' },
      { index: 2, depth: 2, slug: 'intro-1' },
      { index: 3, depth: 3, slug: 'deep-alias' },
    ]);
  });
});
