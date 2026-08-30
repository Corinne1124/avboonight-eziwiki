---
title: 导航配置
description: 侧边栏是如何构建的，以及如何接管它
order: 2
---

# 导航配置

**你通常不需要配置导航。**`content/` 下的每个 Markdown 文件都会被发布并自动放入侧边栏，按文件夹分组。本网站的侧边栏就是这样构建的——`payload/config.ts` 中完全没有导航数组。

只有当你想实现文件系统无法表达的内容时，才需要配置导航。

## 默认行为：来自文件系统

```
content/
├── intro.md                    → 一个顶级页面
└── getting-started/            → 一个分区
    ├── quick-start.md          → 分区内的一个页面
    └── installation.md
```

名称取自每个页面的 Frontmatter `title`，若未设置则回退到整理过的文件名（`quick-start.md` → "Quick Start"）。

名称以 `_` 或 `.` 开头的文件和文件夹会被跳过，因此草稿可以放在 `content/_drafts/` 中而不被发布。

## 排序

### 页面——Frontmatter `order`

```markdown
---
title: Quick Start
order: 1
---
```

数字越小越靠前。没有设置 `order` 的页面排在已设置 `order` 的页面之后，并按标题字母顺序排列。

### 分区——`_meta.json`

在文件夹的页面旁放置一个 `_meta.json`：

```json
{
  "name": "📚 Getting Started",
  "order": 2,
  "color": "#dbeafe"
}
```

| 字段     | 用途                                           |
| -------- | ------------------------------------------------- |
| `name`   | 分区标签；默认为整理后的文件夹名 |
| `order`  | 同级之间的位置                           |
| `color`  | 背景色，格式为 `#rrggbb`                     |
| `icon`   | 图标标识符                                   |
| `hidden` | 将整个分区从侧边栏中隐藏         |

### 页面与分区混排

顶级页面与分区共享同一条顺序。根页面的 `order` 与各分区的 `_meta.json` 中的 `order` 一起参与排序：

```
content/intro.md         order: 1   → 第一
content/getting-started/ order: 2   → 第二
content/configuration/   order: 3   → 第三
```

## 阅读顺序

侧边栏的顺序也就是阅读顺序。每个页面末尾都带有指向前一页和后一页的链接，因此可以一口气读完整个指南，而无需回到侧边栏寻找当前的位置。

这里无需任何配置：阅读顺序就是侧边栏的展开结果，因此修改 `order` 或 `_meta.json` 会同时改变两者，二者不会产生冲突。

[[hidden-pages|隐藏页面]]会被排除在外——按顺序阅读指南时不应跳到被刻意隐藏的页面——而且第一页和最后一页只会显示一个链接而不是两个。

这些链接带有 `rel="prev"` 和 `rel="next"` 属性，这是向爬虫声明页面序列的方式。

## 隐藏页面

```markdown
---
title: Draft
hidden: true
---
```

该页面仍会被构建，也仍可通过 URL 访问——只是不会出现在侧边栏、[[search]]、[[graph-and-backlinks|关系图]]或站点地图中。参见 [[hidden-pages]]。

## 手动接管导航

当你想实现文件夹结构无法产生的顺序或分组时，可以在 `payload/config.ts` 中添加一个 `navigation` 数组：

```typescript
navigation: [
  { name: '🏠 Introduction', path: 'intro' },
  {
    name: '📚 Getting Started',
    color: '#dbeafe',
    children: [
      { name: 'Quick Start', path: 'getting-started/quick-start' },
      { name: 'Installation', path: 'getting-started/installation' },
    ],
  },
];
```

| 字段       | 用途                                                   |
| ---------- | --------------------------------------------------------- |
| `name`     | 侧边栏中的标签                                      |
| `path`     | 不带 `.md` 的内容路径；省略以创建分区标题 |
| `children` | 嵌套条目，可任意深度                                |
| `color`    | 条目及其子条目的背景色             |
| `icon`     | 图标标识符                                           |
| `hidden`   | 隐藏该条目及其下所有内容                   |

### 手动与自动并存

`navigation` 数组不必是完整的。你编写的条目控制命名与顺序；未被提及的页面仍会被自动发现，并追加到覆盖其文件夹的分区中。

这意味着添加页面永远不_需要_编辑配置——它只是让你能够覆盖页面所在的位置。

当一个分区的所有条目都位于某个文件夹中时，该分区就被视为覆盖这个文件夹。跨越多个文件夹的分区则不会被修改，因为向其中追加内容只能靠猜测；来自未归属文件夹的已发现页面会另建一个新的分区。

要使数组变得完整并完全停止自动发现：

```typescript
global: {
  autoNavigation: false,
}
```

## 嵌套

按需任意嵌套——文件系统和数组都支持。超过三四层之后，侧边栏就会变得难以浏览；不妨考虑一下 [[search]] 和 [[wiki-links|Wiki 链接]] 是否比再增加一层文件夹对读者更有帮助。

## 检查结果

```bash
npm run show-urls
```

按顺序列出将要构建的每个页面及其 URL。

## 下一步

- [[payload]] — 配置文件中的其他内容
- [[theme]] — 颜色与外观
- [[frontmatter]] — 完整的页面字段列表
