import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './render';

describe('inline spoilers', () => {
  it('masks ||text|| as a clickable pill', async () => {
    const { html } = await renderMarkdown('小心，前方有剧透：||真凶其实是管家||。\n');

    expect(html).toContain('class="ezw-spoiler"');
    expect(html).toContain('class="ezw-spoiler__toggle"');
    expect(html).toContain('class="ezw-spoiler__text"');
    expect(html).toContain('真凶其实是管家');
    expect(html).not.toContain('||');
  });

  it('masks several spoilers in one paragraph', async () => {
    const { html } = await renderMarkdown('||甲||和||乙||都死了。\n');

    expect(html.match(/class="ezw-spoiler"/g)).toHaveLength(2);
    expect(html).toContain('甲');
    expect(html).toContain('乙');
  });

  it('resolves a wiki link written inside a spoiler', async () => {
    const { html } = await renderMarkdown('详情藏在 ||[[quick-start]]|| 里。\n');

    expect(html).toContain('class="ezw-spoiler"');
    expect(html).toContain('href="/example/getting-started/quick-start/"');
  });

  it('leaves code spans and fences alone', async () => {
    const inline = await renderMarkdown('用 `a || b` 或 `x || y || z` 表示逻辑或。\n');
    const fenced = await renderMarkdown('```\nconst ok = a || b;\n```\n');

    expect(inline.html).not.toContain('ezw-spoiler');
    expect(inline.html).toContain('a || b');
    expect(fenced.html).not.toContain('ezw-spoiler');
  });

  it('keeps an unclosed marker as written', async () => {
    const { html } = await renderMarkdown('这句话里有一个||没闭合的标记。\n');

    expect(html).not.toContain('ezw-spoiler');
    expect(html).toContain('||没闭合的标记。');
  });

  it('keeps a spoiler inside a callout working', async () => {
    const { html } = await renderMarkdown('> [!NOTE] 注意\n> 正文里有 ||剧透内容||。\n');

    expect(html).toContain('ezw-callout--note');
    expect(html).toContain('class="ezw-spoiler"');
  });
});

describe('spoiler callouts', () => {
  it('renders [!SPOILER] as a closed disclosure with the title visible', async () => {
    const { html } = await renderMarkdown('> [!SPOILER] 结局\n>\n> 主角其实早已死去。\n');

    expect(html).toContain('ezw-callout ezw-callout--spoiler');
    expect(html).toMatch(/<details[^>]*class="ezw-callout ezw-callout--spoiler"/);
    expect(html).not.toMatch(/<details[^>]*\bopen\b/);
    expect(html).toContain('结局');
    expect(html).toContain('主角其实早已死去。');
    expect(html).not.toContain('[!SPOILER]');
  });

  it('accepts the Chinese marker [!剧透]', async () => {
    const { html } = await renderMarkdown('> [!剧透] 谁是凶手\n>\n> 秘密内容。\n');

    expect(html).toContain('ezw-callout--spoiler');
    expect(html).toContain('秘密内容。');
    expect(html).not.toContain('[!剧透]');
  });

  it('starts open when the marker says so', async () => {
    const { html } = await renderMarkdown('> [!SPOILER]+ 已知\n>\n> 内容可见。\n');

    expect(html).toMatch(/<details[^>]*\bopen\b/);
    expect(html).toContain('内容可见。');
  });
});
