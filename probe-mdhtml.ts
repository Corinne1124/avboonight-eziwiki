import { renderMarkdown } from './lib/markdown/render';

async function main(): Promise<void> {
  const samples: Array<[string, string]> = [
    ['div 无空行（CommonMark HTML block，应为原样）', '<div>\n**加粗** 与 *斜体*\n</div>\n'],
    ['div 内容空行隔开', '<div class="box">\n\n**加粗段落** 和列表：\n\n- 甲\n- 乙\n\n</div>\n'],
    ['details/summary', '<details>\n<summary>点开</summary>\n\n**隐藏的加粗**\n\n- 列表项\n\n</details>\n'],
    ['行内 span', '<span style="color:red">红色 **加粗** 文字</span>\n'],
    ['div 内 wiki 链接与剧透', '<div>\n\n看看 [[quick-start]] 和 ||剧透内容||\n\n</div>\n'],
    ['div 带原始嵌套标记（表格）', '<div>\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n</div>\n'],
    ['html 紧贴文本的块', '文字在前\n\n<div>\n**加粗**\n</div>\n'],
  ];

  for (const [name, src] of samples) {
    const { html } = await renderMarkdown(src);
    console.log(`======== ${name} ========`);
    console.log('--- 输入 ---\n' + src + '--- 输出 ---\n' + html + '\n');
  }
}

void main();
