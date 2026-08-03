---
title: Payload Configuration
description: Every field in payload/config.ts, and what it does
order: 1
---

# Payload Configuration

`payload/config.ts` holds your site's metadata, URL behaviour, and theme. It is
deliberately small — pages come from the filesystem, not from here.

## Minimum viable config

```typescript
import { Payload } from '@/lib/payload/types';

export const payload: Payload = {
  global: {
    title: 'My Wiki',
    description: 'My personal knowledge base',
  },
};

export default payload;
```

That is a complete, working site. Everything else is optional.

## `global`

### Required

| Field         | Purpose                                          |
| ------------- | ------------------------------------------------ |
| `title`       | Site title, shown in the browser tab             |
| `description` | Site description, used for SEO and as a fallback |

### Behaviour

```typescript
global: {
  urlStrategy: 'path',     // 'path' | 'hash'   — default 'path'
  autoNavigation: true,    // boolean           — default true
}
```

- **`urlStrategy`** — whether URLs mirror the content tree or are hashed. See
  [[url-strategies]].
- **`autoNavigation`** — whether pages under `content/` are discovered and added
  to the sidebar without being listed. See [[navigation]].

### Presentation and SEO

```typescript
global: {
  favicon: '/favicon.svg',
  baseUrl: 'https://mywiki.com',
  seo: {
    openGraph: {
      title: 'My Wiki — Knowledge Base',
      description: 'My personal knowledge base',
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'My Wiki' }],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@myhandle',
    },
  },
}
```

- **`favicon`** — path to a file in `public/`
- **`lang`** — BCP 47 language tag for the content, such as `ko` or `ja`.
  Announced on the root element, where screen readers take pronunciation from
  it and translation tools decide what to offer. Defaults to `en`, so a wiki
  written in another language should set it.
- **`baseUrl`** — used for canonical URLs, the sitemap, and Open Graph tags. Set
  it before you publish; social previews and `robots.txt` depend on it.
- **`repoUrl`** — source repository, linked from the sidebar. Omit it and no
  link is rendered, so a wiki with no public source shows no dead control.

Individual pages override the title, description, and OG image through their
[[frontmatter]].

## `navigation`

Optional. Omit it and the sidebar is built from `content/`. Provide it to
control naming and ordering — see [[navigation]] for the full picture.

## `theme`

```typescript
theme: {
  primary: '#2563eb',      // Links and accents
  secondary: '#7c3aed',    // Secondary accent
  background: '#ffffff',   // Page background
  text: '#1f2937',         // Body text
  sidebarBg: '#f9fafb',    // Sidebar background
  codeBg: '#f3f4f6',       // Inline code background
}
```

Every field is optional and falls back to the default palette. Colours must be
six-digit hex. See [[theme]].

## Validation

The config is checked against a JSON Schema before every build:

```bash
npm run validate:payload
```

It catches missing required fields, malformed colours, and an invalid
`urlStrategy`. It runs automatically as the first step of `npm run build`, so a
broken config fails immediately rather than partway through rendering.

## Environment variables

```typescript
global: {
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
}
```

The config is ordinary TypeScript, so anything available at build time works.

## Types

`Payload` is fully typed, so your editor will autocomplete fields, flag typos,
and show the documentation for each option inline. If a field is not in the
type, it is not a real option.

## Next

- [[navigation]] — how the sidebar is assembled
- [[theme]] — colours and appearance
- [[frontmatter]] — per-page settings
