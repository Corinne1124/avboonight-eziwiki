import { describe, expect, it } from 'vitest';
import { themeCss } from './theme';

describe('themeCss', () => {
  it('emits nothing when no theme is set', () => {
    expect(themeCss(undefined)).toBe('');
    expect(themeCss({})).toBe('');
  });

  it('maps each key onto the property the stylesheets read', () => {
    const css = themeCss({ background: '#fffbeb', sidebarBg: '#fef3c7', codeBg: '#fde68a' });

    expect(css).toContain('--color-background:#fffbeb');
    expect(css).toContain('--color-sidebar-bg:#fef3c7');
    expect(css).toContain('--color-code-bg:#fde68a');
  });

  it('derives a hover shade for the accent colours', () => {
    const css = themeCss({ primary: '#e11d48' });

    expect(css).toContain('--color-primary:#e11d48');
    expect(css).toContain('--color-primary-hover:color-mix(in srgb,#e11d48 85%,black)');
  });

  it('applies only to the light palette', () => {
    expect(themeCss({ text: '#111' })).toMatch(/^html:not\(\.dark\)\{.*\}$/);
  });

  it('skips blank values', () => {
    expect(themeCss({ primary: '  ', secondary: '#7c3aed' })).toBe(
      'html:not(.dark){--color-secondary:#7c3aed;--color-secondary-hover:color-mix(in srgb,#7c3aed 85%,black)}',
    );
  });
});
