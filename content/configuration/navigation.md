---
title: Navigation Configuration
description: How the sidebar is built, and how to take control of it
order: 2
---

# Navigation Configuration

**You usually do not configure navigation.** Every Markdown file under
`content/` is published and placed in the sidebar automatically, grouped by
folder. This site's sidebar is built that way — `payload/config.ts` contains no
navigation array at all.

Configure it only when you want something the filesystem cannot express.

## The default: from the filesystem

```
content/
├── intro.md                    → a top-level page
└── getting-started/            → a section
    ├── quick-start.md          → a page inside it
    └── installation.md
```

Names come from each page's frontmatter `title`, falling back to a tidied-up
file name (`quick-start.md` → "Quick Start").

Files and folders whose names start with `_` or `.` are skipped, so drafts can
live in `content/_drafts/` without being published.

## Ordering

### Pages — frontmatter `order`

```markdown
---
title: Quick Start
order: 1
---
```

Lower numbers come first. Pages without an `order` sort after those that have
one, alphabetically by title.

### Sections — `_meta.json`

Drop a `_meta.json` beside a folder's pages:

```json
{
  "name": "📚 Getting Started",
  "order": 2,
  "color": "#dbeafe"
}
```

| Field    | Purpose                                           |
| -------- | ------------------------------------------------- |
| `name`   | Section label; defaults to the tidied folder name |
| `order`  | Position among siblings                           |
| `color`  | Background tint, as `#rrggbb`                     |
| `icon`   | Icon identifier                                   |
| `hidden` | Keep the whole section out of the sidebar         |

### Mixing pages and sections

Top-level pages and sections share one sequence. A root page's own `order` ranks
it against the sections' `_meta.json` orders:

```
content/intro.md         order: 1   → first
content/getting-started/ order: 2   → second
content/configuration/   order: 3   → third
```

## Reading order

The sidebar order is also the reading order. Every page ends with links to the
one before and the one after it, so a guide can be read straight through
without going back to the sidebar to find your place.

There is nothing to configure: the sequence is the sidebar flattened, so
changing `order` or a `_meta.json` moves both at once and they cannot disagree.

[[hidden-pages|Hidden pages]] are left out — stepping through a guide should
not land on something deliberately unlisted — and the first and last pages
simply show one link instead of two.

The links carry `rel="prev"` and `rel="next"`, which is how a sequence of pages
is declared to a crawler.

## Hiding a page

```markdown
---
title: Draft
hidden: true
---
```

The page still builds and is still reachable by URL — it just does not appear in
the sidebar, [[search]], the [[graph-and-backlinks|graph]], or the sitemap. See
[[hidden-pages]].

## Taking manual control

Add a `navigation` array to `payload/config.ts` when you want an order or a
grouping the folder structure cannot produce:

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

| Field      | Purpose                                                   |
| ---------- | --------------------------------------------------------- |
| `name`     | Label in the sidebar                                      |
| `path`     | Content path without `.md`; omit to make a section header |
| `children` | Nested items, to any depth                                |
| `color`    | Background tint for the item and its children             |
| `icon`     | Icon identifier                                           |
| `hidden`   | Hide this item, and everything under it                   |

### Manual and automatic together

A `navigation` array does not have to be exhaustive. Entries you write control
naming and order; any page it does not mention is still discovered and appended
to the section covering its folder.

That means adding a page never _requires_ editing config — it only lets you
override where it lands.

A section is taken to cover a folder when all its entries live in that folder.
Sections spanning several folders are left alone, since appending to them would
be a guess; discovered pages from an unclaimed folder get a new section instead.

To make the array exhaustive and stop discovery entirely:

```typescript
global: {
  autoNavigation: false,
}
```

## Nesting

Nest as deep as you need — the filesystem and the array both support it. Past
three or four levels a sidebar gets hard to scan; consider whether [[search]]
and [[wiki-links|wiki links]] would serve readers better than another tier of
folders.

## Checking the result

```bash
npm run show-urls
```

Lists every page that will be built, in order, with its URL.

## Next

- [[payload]] — everything else in the config file
- [[theme]] — colours and appearance
- [[frontmatter]] — the full list of page fields
