<div align="center">
  <img src="eziwiki.webp" alt="EziWiki">
  <br/><hr/>
</div>

<p align="center"><em><strong>A modern, lightweight wiki and documentation generator</strong></em></p>

<p align="center">
  <a href="https://i3months.com">🌐 Live Demo</a> •
  <a href="https://eziwiki.vercel.app">🌐 Demo (Vercel)</a> •
  <a href="https://i3months.github.io/eziwiki">🌐 Demo (GitHub Pages)</a>
</p>

## Introduction

Write Markdown, get a fast static wiki.

- **A file is a page** — drop a `.md` into `content/` and it is published; folders become sections
- **Search, contents rail, wiki links, embeds, backlinks, and graph views** — built in, no configuration
- **Rendered at build time** — no Markdown parser or highlighter ships to the browser
- **Deploy anywhere** — the output is plain static files

## Requirements

- Node.js 18.0 or higher
- npm (comes with Node.js)

## Quick Start

```bash
npx create-eziwiki my-docs
cd my-docs
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your wiki.

To work from this repository instead — with the full demo content:

```bash
git clone https://github.com/i3months/eziwiki.git
cd eziwiki
npm install
npm run dev
```

## Upgrading from an earlier version

**Page URLs changed.** Earlier versions addressed every page by a hash
(`/c432b372-e0e30267-e65e26a1`). The default is now the readable content path
(`/getting-started/quick-start`), which is indexable and shareable.

If your site is already published and you need the old links to keep working,
opt back in from `payload/config.ts`:

```typescript
global: {
  urlStrategy: 'hash',
}
```

Otherwise no action is needed — existing Markdown links keep resolving either
way, since they are written as content paths and resolved at build time.

Navigation also became optional: pages under `content/` are now discovered
automatically. An existing `navigation` array keeps working unchanged.

## Project Structure

```
eziwiki/
├── payload/
│   └── config.ts          # Site configuration
├── content/               # Your Markdown files
│   ├── intro.md
│   ├── guides/
│   ├── api/
│   └── tutorials/
├── public/                # Static assets
│   ├── images/
│   └── favicon.svg
├── out/                   # Built site (auto-generated)
│
├── app/                   # Next.js pages
├── components/            # React components
├── lib/                   # Core utilities
├── scripts/               # Build scripts
└── styles/                # Global styles
```

**To get started, edit:**

- `payload/config.ts` - Navigation, theme, SEO
- `content/` - Your Markdown content
- `public/` - Images and assets

**Want to customize further?** You can modify `components/`, `styles/`, and `lib/` to fit your needs.

## Configuration

### Edit `payload/config.ts`

```typescript
import { Payload } from '@/lib/payload/types';

export const payload: Payload = {
  global: {
    title: 'My Wiki',
    description: 'My personal knowledge base',
    baseUrl: 'https://your-site.com',
    repoUrl: 'https://github.com/you/your-wiki', // Optional; linked from the sidebar
    urlStrategy: 'path', // 'path' (readable, SEO-friendly) | 'hash' (opaque)
    autoNavigation: true, // Discover content/ files not listed below
  },
  // Optional. Omit it entirely and navigation is built from content/.
  navigation: [
    {
      name: 'Introduction',
      path: 'intro', // Links to content/intro.md
    },
    {
      name: 'Guides',
      color: '#fef08a', // Optional folder color
      children: [
        { name: 'Quick Start', path: 'guides/quick-start' },
        { name: 'Configuration', path: 'guides/configuration' },
      ],
    },
  ],
  theme: {
    // Optional - uses defaults if omitted
    primary: '#2563eb',
    secondary: '#7c3aed',
  },
};
```

### Navigation Options

Navigation is optional. Every Markdown file under `content/` is published
automatically, and any file the config does not mention is appended to the
section matching its directory. Use `navigation` only to control naming and
ordering; set `global.autoNavigation: false` to make it exhaustive instead.

Ordering and presentation can also come from the content itself:

**Frontmatter (per page):**

```markdown
---
title: Quick Start # Sidebar label; falls back to the filename
description: Get going in 5 minutes
order: 1 # Sort weight within its directory
hidden: true # Buildable and linkable, but absent from the sidebar
---
```

**`_meta.json` (per directory):**

```json
{ "name": "📚 Getting Started", "order": 1, "color": "#dbeafe" }
```

**Basic page:**

```typescript
{ name: 'Getting Started', path: 'intro' }
```

**Folder with children:**

```typescript
{
  name: 'Guides',
  color: '#fef08a',  // Optional
  children: [
    { name: 'Setup', path: 'guides/setup' },
  ],
}
```

**Hidden page:**

```typescript
{ name: 'Secret', path: 'private/notes', hidden: true }
```

### Add Content

Create Markdown files in `content/` matching your paths:

**`content/guides/quick-start.md`**

```markdown
---
title: Quick Start Guide
---

# Quick Start Guide

Welcome! Check out the [Configuration Guide](/guides/configuration).
```

Frontmatter is optional.

## Export

Build your wiki as static files:

```bash
npm run build
```

Deploy the `out/` directory to Netlify, Vercel, Github pages

## Features

### Search

Press <kbd>⌘K</kbd> (<kbd>Ctrl K</kbd> on Windows and Linux) anywhere, or click the
search box in the sidebar.

Full-text search covers page titles, every heading, and page contents. Results
link straight to the matching section rather than the top of the page. The index
is generated at build time into `public/search-index.json` and searched entirely
in the browser — no server, no third-party service, works on any static host.

It is fetched the first time you search, so pages that are only read never
download it.

Korean, Japanese, and Chinese content is indexed by character bigrams, so
searching `위키` matches `위키문서를` — which whitespace tokenisation alone would
miss.

### Table of Contents

Every page gets an automatic contents rail on wide screens, built from its `h2`
through `h4` headings, with the current section highlighted as you scroll. It is
rendered at build time, so it is in the HTML rather than assembled by script.

### Heading Anchors

Every heading below the title carries a link to itself, shown on hover or
keyboard focus, so a section can be shared without reading an id out of the
address bar.

### Wiki Links

Link to a page by name, without knowing where it lives:

```markdown
[[quick-start]] # by file name
[[Quick Start]] # by title
[[getting-started/quick-start]] # by full path
[[quick-start#prerequisites|Step one]] # anchor and label
```

A shorthand matching several pages is refused rather than guessed at, and a
target matching nothing renders as visibly broken text instead of a dead link.
`npm run check:links` lists them all.

Rest on any wiki link and a card shows the target's title and opening lines.
Both are written onto the link during the build, so the card costs no request —
and keyboard users get it on focus, dismissed with <kbd>Esc</kbd>.

### Embeds and Transclusion

A leading `!` shows the target instead of linking to it, the way a vault does:

```markdown
![[diagram.png]] # an image from public/, by name or by path
![[diagram.png|Architecture]] # the label becomes alt text
![[quick-start]] # another page's text, inline
![[quick-start#prerequisites]] # just that section
```

An included page is boxed and carries a link back to where it is maintained, so
a passage can live in one document and appear wherever it is needed rather than
being copied.

Transclusion applies when the embed is alone in its paragraph — blocks cannot
sit inside a sentence — and a page cannot include itself, directly or through a
chain. Nesting stops after three levels. Included headings stay out of the
contents rail, which describes the page you are on.

### Diagrams

A ```mermaid fence is drawn during the build and arrives as an SVG — no
renderer ships to the browser, nothing shifts as the page loads, and a crawler
sees the diagram. Colours come from the stylesheet, so it follows dark mode.

`flowchart`, `sequenceDiagram`, `stateDiagram-v2`, `classDiagram` and
`erDiagram` are supported; anything else stays a code block rather than
stopping the build.

### Callouts

A blockquote opening with `[!KIND]` becomes a callout, using the syntax GitHub
and Obsidian share:

```markdown
> [!WARNING] Mind the gap
> A title on the marker line replaces the default.

> [!TIP]- Folded away
> A trailing `-` makes it a `<details>`, which needs no script.
```

`note`, `tip`, `important`, `warning` and `caution` each carry a colour, and
Obsidian's longer list maps onto the nearest of them. An unrecognised kind
stays an ordinary quote.

### Aliases

Pages move. Since a URL comes from a file's path, moving one breaks every link
to the old address — declare it and the old URL keeps answering:

```markdown
---
title: Setup
aliases:
  - guides/setup
---
```

Each alias is built as a page that forwards, `noindex`, with its canonical
pointing at the destination. An alias that shadows a real page, or that two
pages claim, stops the build.

### Reading Order

Every page ends with links to the previous and next page. The sequence is the
sidebar flattened, so it follows `order` and `_meta.json` without separate
configuration, and hidden pages are skipped. The links carry `rel="prev"` and
`rel="next"`.

### Backlinks and Graph

Every page ends with the pages that link to it, gathered from both wiki links
and ordinary Markdown links, and with a small graph of its own neighbourhood:
the page, everything one link away in either direction, and the links among
those neighbours.

The `/graph` page draws the whole site — node size by link count, hover to
isolate a neighbourhood, click to navigate. It is plain SVG with a small
force-directed layout, so no charting library is downloaded anywhere.

### URL Strategies

Set `global.urlStrategy` in `payload/config.ts`:

```
'path' (default)  guides/setup → /guides/setup
'hash'            guides/setup → /c432b372-e0e30267-e65e26a1
```

`path` gives readable, indexable, shareable URLs. `hash` conceals the content
structure, at the cost of SEO and of URLs anyone can interpret — reach for it
only when obscurity is the point.

Either way, write ordinary paths in Markdown and they resolve automatically:

```markdown
[Setup Guide](/guides/setup)
```

List every page and its URL: `npm run show-urls`

### Build-Time Rendering

Markdown is compiled to HTML during the build — parsed, syntax-highlighted with
[Shiki](https://shiki.style), and link-resolved — so no Markdown parser or
highlighter is shipped to the browser. Content pages load **88 kB** of JS
instead of the 314 kB a runtime renderer required.

Shiki bundles grammars for over a hundred languages, and loading all of them
costs ~20s before the first page renders. eziwiki scans your content and loads
only the languages it actually contains, plus common defaults — initialisation
drops to under a second. Unrecognised fences render as plain text rather than
failing the build.

### Automatic Navigation

There is no navigation array to maintain — this repository's own
`payload/config.ts` has none. Pages are discovered under `content/`, grouped by
folder, and ordered by frontmatter `order` and per-folder `_meta.json`:

```json
{ "name": "📚 Getting Started", "order": 2, "color": "#dbeafe" }
```

Add a `navigation` array when you want manual control; it does not have to be
exhaustive, since undeclared pages are still discovered and appended.

## Commands

```bash
npm run dev              # Development server
npm run build            # Build for production
npm run validate:payload # Check configuration
npm run check:links      # Report links that point at no page
npm run build:search     # Regenerate the search index
npm run show-urls        # List every page and its URL
npm run build:template   # Rebuild the create-eziwiki template
npm test                 # Run the test suite
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.
