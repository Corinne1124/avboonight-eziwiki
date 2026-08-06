# create-eziwiki

Scaffold a new [eziwiki](https://github.com/i3months/eziwiki) documentation site.

```bash
npx create-eziwiki my-docs
cd my-docs
npm install
npm run dev
```

## What you get

A complete, static-exportable wiki:

- **Pages from files** — every Markdown file under `content/` is published, no registration step
- **Search** — full-text over titles, headings, and body, with a ⌘K palette; runs entirely in the browser
- **Contents rail** with scroll tracking, generated at build time
- **Wiki links** — `[[page]]` resolves by path, file name, or title, and hovering one previews where it goes
- **Embeds** — `![[image.png]]` places a file, `![[page]]` includes another page's text, `![[page#section]]` just one section
- **Backlinks** on every page, plus a graph of its **neighbourhood** — and a `/graph` view of the whole site
- **Build-time rendering** — Markdown is compiled and syntax-highlighted during the build, so no parser ships to the browser
- **Last updated** on every page, taken from the commit that last touched it, alongside a link to edit the page where it lives
- Dark mode, maths, GFM, SEO metadata, sitemap

## Layout

```
my-docs/
├── content/           # Your Markdown. Folders become sidebar sections.
│   └── _meta.json     # Optional per-folder name, order, colour
├── payload/config.ts  # Title, theme, URL strategy, optional navigation
├── public/            # Static assets
└── app/ lib/ components/   # The engine — edit only if you want to
```

## Development

The template is generated from the eziwiki repository rather than kept as a
separate copy, so it never drifts from the tested source:

```bash
npm run build:template   # in the eziwiki repo, regenerates ./template
```

## Licence

MIT
