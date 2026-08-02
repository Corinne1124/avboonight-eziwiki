---
title: Hidden Pages
description: Pages that build and resolve but stay unlisted
order: 6
---

# Hidden Pages

A hidden page is built and reachable by URL, but is left out of everywhere a
reader would otherwise stumble across it.

## What "hidden" means

| Appears in                                         | Hidden page |
| -------------------------------------------------- | ----------- |
| Sidebar navigation                                 | No          |
| [[search\|Search]] results                         | No          |
| [[graph-and-backlinks\|Graph]] and backlink panels | No          |
| `sitemap.xml`                                      | No          |
| Its own URL                                        | **Yes**     |

Hidden pages also carry a `noindex` robots tag, so a search engine that
encounters the URL will not list it.

Useful for drafts, unlisted references, and pages you want to link to directly
without putting them in the navigation.

## Hiding a page

Add `hidden: true` to its frontmatter:

```markdown
---
title: Draft Notes
description: Not ready yet
hidden: true
---

# Draft Notes
```

That is all. This is how [[secret-demo|this site's own hidden page]] is marked.

### Or from navigation

If you maintain a manual `navigation` array, an entry can be hidden there
instead:

```typescript
navigation: [{ name: 'Draft Notes', path: 'notes/draft', hidden: true }];
```

Hiding a section hides everything beneath it:

```typescript
{
  name: 'Internal',
  hidden: true,
  children: [
    { name: 'Runbook', path: 'internal/runbook' },   // also hidden
    { name: 'Oncall',  path: 'internal/oncall' },    // also hidden
  ],
}
```

Both mechanisms are honoured, so a page hidden either way is hidden everywhere.

## Finding the URL

```bash
npm run show-urls
```

```
🔒 [HIDDEN] Secret Demo Page
   source → content/secret-demo.md
   url    → https://eziwiki.vercel.app/secret-demo
```

## Hidden is not private

**A hidden page is a public file in your static export.** Anyone with the URL
can read it, and nothing prevents it being shared. Using
[[url-strategies|hashed URLs]] makes the address unguessable, which is
obscurity, not access control.

If content must not be read by the wrong person, do not publish it. Keep it out
of `content/`, or put the whole site behind authentication at the host.

## Excluding a page entirely

To keep a file in the repository but out of the build altogether, prefix its
name or its folder with `_`:

```
content/
├── _drafts/          ← never built
│   └── half-done.md
└── published.md
```

Files and folders starting with `_` or `.` are skipped by the content scanner,
so they produce no page at all.

Use `_` for work that should not exist yet, and `hidden: true` for work that
should exist but not be advertised.

## Next

- [[url-strategies]] — readable versus opaque URLs
- [[navigation]] — how the sidebar is built
