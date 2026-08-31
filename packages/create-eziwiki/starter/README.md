# 我的 Wiki

由 [eziwiki](https://github.com/i3months/eziwiki) 构建。

## 开发

```bash
npm install
npm run dev
```

打开 <http://localhost:3000>。

## 编写内容

把 Markdown 文件放入 `content/`。每个文件都会自动成为一个页面——文件夹会变成侧边栏分区。`content/guides/writing.md` 介绍了页面中可以包含的内容。

在 `payload/config.ts` 中设置站点标题、主题和 URL 样式。

## 构建

```bash
npm run build
```

结果是一个完全静态的站点，位于 `out/`，可部署到 GitHub Pages、Netlify、Vercel、S3 或任何静态托管平台。

每个页面都会标注最后修改它的那次提交日期，因此请从带有完整历史的仓库进行构建——浅克隆会让页面没有日期。在 GitHub Actions 上，这意味着要以 `fetch-depth: 0` 检出。在 `payload/config.ts` 中设置 `repoUrl` 后，每个页面还会链接到自己的源码以便编辑。

## 命令

```bash
npm run dev              # 开发服务器
npm run build            # 静态生产构建
npm run check:links      # 报告无法解析的链接和值得编写的页面
npm run new <path>       # 创建页面，含 frontmatter
npm run show-urls        # 列出每个页面及其 URL
npm test                 # 运行测试套件
```
