---
title: URL Strategies
description: Choose between readable paths and opaque hashes for your page URLs
order: 1
---

# URL Strategies

eziwiki can express your pages' URLs in one of two ways. Set it once in
`payload/config.ts`:

```typescript
global: {
  urlStrategy: 'path',  // or 'hash'
}
```

## `path` — readable URLs (default)

URLs mirror the content tree:

```
content/getting-started/quick-start.md  →  /getting-started/quick-start
content/intro.md                        →  /intro
```

Readers can tell where a link goes before clicking it, search engines can index
the structure, and a URL pasted into chat carries meaning on its own.

**Use this unless you have a specific reason not to.**

## `hash` — opaque URLs

Each path is hashed into a stable, meaningless segment:

```
content/getting-started/quick-start.md  →  /a3f2e9d1-4b8c7e6f-9d2a1b3c
content/intro.md                        →  /c432b372-e0e30267-e65e26a1
```

The hash is a SHA-256 digest of the content path, so it is deterministic: the
same file yields the same URL on every build, and links stay valid as long as
the file does not move.

### What this buys you

Someone who has one URL cannot guess another, and cannot infer your content
structure from the address bar.

### What it costs you

- **SEO** — search engines can crawl the pages, but the URL contributes nothing
- **Shareability** — nobody can read a link and know where it leads
- **Trust** — an opaque URL looks like a tracking link to a cautious reader

This is obscurity, not security. Every page is still a public file in your
static export; a hash keeps a URL unguessable, not private. To keep something
genuinely non-public, do not publish it.

## Writing links

Write ordinary content paths in Markdown. They are resolved at build time under
whichever strategy is active, so the same source works either way:

```markdown
See the [Quick Start](/getting-started/quick-start).
```

The same applies to [[wiki-links|wiki links]]:

```markdown
See [[quick-start]].
```

Both come out as `/getting-started/quick-start` under `path`, and as the
matching hash under `hash`.

Links that resolve to no page are left exactly as written — so a typo shows up
as a broken link rather than silently pointing at the home page. Run
[[validation-testing|`npm run check:links`]] to find them.

## Seeing every URL

```bash
npm run show-urls
```

```
📋 Page URLs  (strategy: path)
================================================================================
📄 Quick Start
   source → content/getting-started/quick-start.md
   url    → https://eziwiki.dev/getting-started/quick-start

🔒 [HIDDEN] Secret Demo Page
   source → content/secret-demo.md
   url    → https://eziwiki.dev/secret-demo
```

This is the fastest way to find the address of a [[hidden-pages|hidden page]].

## Switching strategies

Changing `urlStrategy` changes every URL on the site. Existing links, bookmarks,
and search rankings will break. If your site is already published, treat it as a
migration rather than a setting.

## Next

- [[hidden-pages]] — pages that build and resolve but stay unlisted
- [[search]] — find any page by its contents
