# create-eziwiki

使用 [eziwiki](https://github.com/i3months/eziwiki) 脚手架搭建一个全新的文档站点。

```bash
npx create-eziwiki my-docs
cd my-docs
npm install
npm run dev
```

## 你会得到什么

一个完整的、可静态导出的 wiki：

- **文件即页面** — `content/` 下的每个 Markdown 文件都会被发布，无需注册步骤
- **搜索** — 覆盖标题、小标题和正文的全文搜索，带 ⌘K 命令面板；完全在浏览器中运行
- **目录侧栏** — 带滚动跟随，构建时生成
- **Wiki 链接** — `[[page]]` 按路径、文件名或标题解析，悬停即可预览目标
- **嵌入** — `![[image.png]]` 放置文件，`![[page]]` 包含另一个页面的文本，`![[page#section]]` 只包含某一章节
- **反向链接** 出现在每个页面上，外加一张**邻域**关系图——以及整个站点的 `/graph` 视图
- **构建时渲染** — Markdown 在构建期间完成编译和语法高亮，因此不会向浏览器发送任何解析器
- **最后更新时间** 显示在每页上，取自最后一次修改该文件的提交，旁边还有编辑该页面源码的链接
- 深色模式、数学公式、GFM、SEO 元数据、站点地图

## 目录结构

```
my-docs/
├── content/           # 你的 Markdown。文件夹会变成侧边栏分区。
│   └── _meta.json     # 可选的每文件夹名称、排序、颜色
├── payload/config.ts  # 标题、主题、URL 策略、可选导航
├── public/            # 静态资源
└── app/ lib/ components/   # 引擎——只在需要时修改
```

## 开发

模板由 eziwiki 仓库生成，而不是单独维护一份副本，因此它永远不会与经过测试的源码脱节：

```bash
npm run build:template   # 在 eziwiki 仓库中运行，重新生成 ./template
```

## 许可证

MIT
