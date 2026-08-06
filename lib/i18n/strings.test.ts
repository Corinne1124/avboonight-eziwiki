import { describe, it, expect } from 'vitest';
import { resolveStrings, format, DEFAULT_STRINGS, type Strings } from './strings';

describe('resolveStrings', () => {
  it('defaults to English when the wiki declares no language', () => {
    expect(resolveStrings().onThisPage).toBe('On this page');
  });

  it('translates a language it knows', () => {
    expect(resolveStrings('ko').onThisPage).toBe('이 페이지의 목차');
  });

  it('ignores the region a tag carries', () => {
    // `ko-KR` and `ko` are the same interface; only the content differs, and
    // the content is not ours to translate.
    expect(resolveStrings('ko-KR')).toEqual(resolveStrings('ko'));
  });

  it('is not confused by case', () => {
    expect(resolveStrings('KO')).toEqual(resolveStrings('ko'));
  });

  it('falls back to English for a language nobody has translated', () => {
    // Wrong but usable. A key name in place of a label would be neither.
    expect(resolveStrings('de')).toEqual(DEFAULT_STRINGS);
  });

  it('takes the wiki’s own wording over the translation', () => {
    const resolved = resolveStrings('de', { search: 'Suchen…' });

    expect(resolved.search).toBe('Suchen…');
    expect(resolved.onThisPage).toBe(DEFAULT_STRINGS.onThisPage);
  });

  it('leaves the shared tables untouched by an override', () => {
    resolveStrings('ko', { search: 'elsewhere' });

    expect(resolveStrings('ko').search).toBe('검색…');
  });
});

describe('translation completeness', () => {
  const KEYS = Object.keys(DEFAULT_STRINGS) as Array<keyof Strings>;

  it('translates every string into every language it claims', () => {
    // A missing key would fall back to English silently, leaving one English
    // word in an otherwise translated interface — the kind of gap that is only
    // ever found by a reader.
    for (const lang of ['ko']) {
      const table = resolveStrings(lang);
      const missing = KEYS.filter((key) => !table[key]);

      expect(missing, `${lang} is missing strings`).toEqual([]);
    }
  });

  it('keeps every placeholder a translation is given', () => {
    const placeholders = (value: string) => (value.match(/\{\w+\}/g) ?? []).sort();

    for (const lang of ['ko']) {
      const table = resolveStrings(lang);

      for (const key of KEYS) {
        expect(placeholders(table[key]), `${lang}.${key}`).toEqual(
          placeholders(DEFAULT_STRINGS[key]),
        );
      }
    }
  });
});

describe('format', () => {
  it('substitutes a named value', () => {
    expect(format('Linked from {count} pages', { count: 3 })).toBe('Linked from 3 pages');
  });

  it('substitutes every occurrence of a placeholder', () => {
    expect(format('{a} and {a}', { a: 'x' })).toBe('x and x');
  });

  it('leaves a placeholder nobody supplied as written', () => {
    // Visible, and therefore fixable. Substituting an empty string would leave
    // a sentence with a hole in it that reads as merely clumsy.
    expect(format('Hello {name}', {})).toBe('Hello {name}');
  });

  it('does not treat a substituted value as a template', () => {
    expect(format('{a}', { a: '{b}' })).toBe('{b}');
  });
});
