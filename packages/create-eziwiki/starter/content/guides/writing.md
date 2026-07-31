---
title: Writing Pages
description: Frontmatter, links, code, and everything else a page can contain
order: 1
---

# Writing Pages

## Frontmatter

Every page can start with a frontmatter block. All of it is optional.

```markdown
---
title: Writing Pages # Sidebar label; defaults to the file name
description: What this page covers # Used for SEO and search results
order: 1 # Sort weight within its folder
hidden: false # true keeps it out of the sidebar and search
---
```

## Organising pages

Folders become sidebar sections. To name or order one, add a `_meta.json`
beside its pages:

```json
{ "name": "📖 Guides", "order": 1, "color": "#dbeafe" }
```

Files and folders starting with `_` or `.` are skipped, so drafts can live in
`content/_drafts/` without being published.

## Linking

Ordinary Markdown links work with content paths:

```markdown
[Welcome](/intro)
```

Wiki links resolve by full path, file name, or page title — so you can link to
a page without knowing where it sits:

```markdown
[[intro]] [[Writing Pages]] [[guides/writing|see the guide]] [[intro#next]]
```

A link that resolves to nothing is shown as visibly broken rather than as a
dead link. Run `npm run check:links` to list them all.

## Code

Fenced blocks are highlighted at build time and get a copy button:

```typescript
export function greet(name: string): string {
  return `Hello, ${name}!`;
}
```

## Maths

Inline $E = mc^2$ and display maths both render:

$$
\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}
$$

## Tables and task lists

| Feature | Included |
| ------- | -------- |
| Search  | Yes      |
| Graph   | Yes      |

- [x] Write a page
- [ ] Publish it

## Back

Return to [[intro]].
