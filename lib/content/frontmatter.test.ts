import { describe, it, expect } from 'vitest';
import matter from 'gray-matter';
import { yamlScalar } from './frontmatter';

/** Round-trips a title through the frontmatter a new page would be given. */
function roundTrip(title: string): unknown {
  return matter(`---\ntitle: ${yamlScalar(title)}\n---\n\nbody\n`).data.title;
}

describe('yamlScalar', () => {
  it('leaves an ordinary title alone', () => {
    expect(yamlScalar('Quick Start')).toBe('Quick Start');
    expect(yamlScalar('빠른 시작')).toBe('빠른 시작');
    expect(yamlScalar('5 Minute Setup')).toBe('5 Minute Setup');
  });

  it('quotes a title with a colon', () => {
    // Unquoted this is not a title with a colon in it — it is a parse error,
    // and the page it lands in cannot be read at all.
    expect(yamlScalar('Setup: The Basics')).toBe('"Setup: The Basics"');
  });

  it('quotes anything opening with a YAML indicator', () => {
    for (const title of ['- Draft', '? Maybe', '@here', '*star', '!bang', '"quoted"']) {
      expect(yamlScalar(title).startsWith('"'), title).toBe(true);
    }
  });

  it('escapes what double quoting cannot carry raw', () => {
    expect(yamlScalar('He said "hi": twice')).toBe('"He said \\"hi\\": twice"');
    expect(yamlScalar('C:\\path: here')).toBe('"C:\\\\path: here"');
  });
});

describe('the frontmatter a new page is given', () => {
  const titles = [
    'Quick Start',
    'Setup: The Basics',
    'C# Basics',
    'He said "hi"',
    'C:\\Windows',
    '- Draft',
    '빠른 시작: 시작하기',
    '  padded  ',
  ];

  it.each(titles)('parses back to exactly the title asked for: %s', (title) => {
    expect(roundTrip(title)).toBe(title);
  });
});
