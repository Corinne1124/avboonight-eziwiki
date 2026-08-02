---
title: Welcome to eziwiki
description: A beautiful, minimal wiki and documentation site generator
order: 1
---

# Welcome to eziwiki 👋

![eziwiki](/images/eziwiki.webp)

**eziwiki** is a wiki and documentation site generator built on Next.js 14,
inspired by Notion and Obsidian. Write Markdown, get a fast static site.

## Start here

```bash
npx create-eziwiki my-docs
cd my-docs
npm install
npm run dev
```

Open <http://localhost:3000>. See [[quick-start]] for the walkthrough.

## What you get

**Pages from files.** Drop a `.md` file into `content/` and it is published.
Folders become sidebar sections. There is no registration step and no navigation
array to maintain — this very site has none. See [[navigation]].

**[[search|Search]]** across titles, headings, and body text, with a
<kbd>⌘K</kbd> palette. Results link straight to the matching section. It runs
entirely in the browser against a static index, so it works on any host — and
handles Korean, Japanese, and Chinese properly.

**[[table-of-contents|Contents rail]]** on every page, with the section you are
reading highlighted as you scroll.

**[[wiki-links|Wiki links]].** Write `[[quick-start]]` and it resolves by path,
file name, or title. Links that go nowhere are shown as broken instead of
pretending to work.

**[[graph-and-backlinks|Backlinks and a graph view]].** Every page lists what
points at it, and [the graph](/graph) shows how the whole site connects.

**Build-time rendering.** Markdown is parsed, highlighted with Shiki, and
link-resolved during the build, so no Markdown parser or highlighter is sent to
the browser. Content pages load about 88 kB of JavaScript.

**And the rest:** [[dark-mode]], maths via KaTeX, GitHub Flavored Markdown,
[[url-strategies|readable or hashed URLs]], [[hidden-pages]], SEO metadata, and
a sitemap.

## Good for

- **Documentation sites** — API references, user guides, technical docs
- **Personal wikis** — a second brain you actually own
- **Team knowledge bases** — internal docs that stay searchable
- **Learning notes** — study material with real cross-links

## Configuration, in full

```typescript
export const payload: Payload = {
  global: {
    title: 'My Wiki',
    description: 'My personal knowledge base',
  },
};
```

That is a complete site. Everything else — [[theme|colours]],
[[url-strategies|URL style]], SEO, manual [[navigation]] — is optional. See
[[payload]].

## Deploying

`npm run build` produces a fully static site in `out/`. Put it anywhere:
[[static-export|any static host]], [[vercel|Vercel]], or
[[github-pages|GitHub Pages]].

## Next

- [[quick-start]] — build your first wiki
- [[installation]] — detailed setup
- [[markdown-basics]] — what you can write in a page
