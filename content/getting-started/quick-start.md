---
title: Quick Start
description: Get up and running with eziwiki in 5 minutes
order: 1
---

# Quick Start

![eziwiki](/images/eziwiki.webp)

## Prerequisites

- Node.js 18 or newer
- Basic familiarity with Markdown

## Step 1: Create a wiki

```bash
npx create-eziwiki my-docs
```

This scaffolds a complete project — engine, config, and two starter pages.

> Prefer to work from the repository itself? See [[installation]].

## Step 2: Install and run

```bash
cd my-docs
npm install
npm run dev
```

Open <http://localhost:3000>.

## Step 3: Write a page

Create `content/notes/first.md`:

```markdown
---
title: My First Page
description: This is my first wiki page
order: 1
---

# My First Page

Welcome to my wiki!
```

Save it. The page appears in the sidebar under a **Notes** section — no config
change, no restart. That is the whole workflow: **a file is a page**.

## Step 4: Name the section

The folder became a section called "Notes". To label or order it, add
`content/notes/_meta.json`:

```json
{
  "name": "📓 Notes",
  "order": 1,
  "color": "#dbeafe"
}
```

See [[navigation]] for the full set of options.

## Step 5: Link pages together

```markdown
See [[first]] for the basics.
```

Wiki links resolve by file name, full path, or page title, so you can link
without knowing where a page sits. The target page automatically gains a
backlink at its bottom. See [[wiki-links]].

## Step 6: Make it yours

Edit `payload/config.ts`:

```typescript
export const payload: Payload = {
  global: {
    title: 'My Awesome Wiki',
    description: 'My personal knowledge base',
    baseUrl: 'https://mywiki.com',
  },
};
```

Set `baseUrl` before publishing — canonical URLs, the sitemap, and social
previews all use it. See [[payload]] and [[theme]].

## Step 7: Build

```bash
npm run build
```

A fully static site lands in `out/`. Deploy it anywhere — see
[[static-export]].

## Commands

```bash
npm run dev              # Development server
npm run build            # Static production build
npm run start            # Preview the production build

npm run show-urls        # List every page and its URL
npm run check:links      # Report links that point at no page
npm run validate:payload # Check the config

npm run lint             # ESLint
npm run format           # Prettier
npm test                 # Test suite
```

## Next

- [[markdown-basics]] — what a page can contain
- [[frontmatter]] — per-page settings
- [[search]] — how readers will find things
