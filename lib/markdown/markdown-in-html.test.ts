import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './render';

describe('markdown inside raw HTML', () => {
  it('renders a spoiler written inside a table cell', async () => {
    const { html } = await renderMarkdown(
      '<table>\n  <tr>\n    <th>外观</th>\n    <td>灰发，圆框眼镜，||永远不要被外表欺骗||</td>\n  </tr>\n</table>\n',
    );

    expect(html).toContain('<table>');
    expect(html).toContain('class="ezw-spoiler"');
    expect(html).toContain('永远不要被外表欺骗');
  });

  it('renders emphasis, code, maths and wiki links inside a cell', async () => {
    const { html } = await renderMarkdown(
      '<table>\n<tr><td>**加粗** 与 `code` 与 $E=mc^2$ 和 [[quick-start]]</td></tr>\n</table>\n',
    );

    expect(html).toContain('<strong>加粗</strong>');
    expect(html).toContain('<code>code</code>');
    expect(html).toContain('katex');
    expect(html).toContain('href="/example/getting-started/quick-start/"');
  });

  it('renders bold glued to a div tag with no blank line', async () => {
    const { html } = await renderMarkdown('<div class="box">\n**居中加粗**\n</div>\n');

    expect(html).toContain('<div class="box">');
    expect(html).toContain('<strong>居中加粗</strong>');
  });

  it('keeps code, pre and script contents literal', async () => {
    const { html } = await renderMarkdown(
      '<pre>**not bold** ||no spoiler||</pre>\n\n<script>\nif (a || b) {}\n</script>\n',
    );

    expect(html).toContain('**not bold** ||no spoiler||');
    expect(html).toContain('if (a || b) {}');
    expect(html).not.toContain('ezw-spoiler');
  });

  it('leaves a glued list as written, since only inline syntax is supported', async () => {
    const { html } = await renderMarkdown('<div>\n- 甲\n- 乙\n</div>\n');

    // Without blank lines the block is raw, and the plugin refuses it rather
    // than guessing at block semantics — lists still need a blank line between
    // the tags.
    expect(html).toContain('- 甲');
    expect(html).not.toContain('<li>');
  });

  it('still parses markdown separated from the tags by blank lines', async () => {
    const { html } = await renderMarkdown('<div>\n\n**内容**\n\n</div>\n');

    expect(html).toContain('<strong>内容</strong>');
  });

  it('still keeps raw HTML with no markdown markers untouched', async () => {
    const { html } = await renderMarkdown('<div class="custom">hello world</div>\n');

    expect(html).toContain('<div class="custom">hello world</div>');
  });

  it('keeps an attribute with a > inside its quotes intact', async () => {
    const { html } = await renderMarkdown('<div data-x="a > b">**bold**</div>\n');

    expect(html).toContain('data-x="a > b"');
    expect(html).toContain('<strong>bold</strong>');
  });
});
