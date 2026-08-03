---
title: Frontmatter
description: Add metadata to your Markdown files
order: 2
---

# Frontmatter

Frontmatter is YAML metadata at the top of your Markdown files. It's optional but recommended for better SEO and organization.

## Basic Syntax

Frontmatter is enclosed between `---` markers:

```markdown
---
title: My Page Title
description: A brief description of the page
---

# My Page Title

Your content here...
```

## Supported Fields

### title

The page title used in:

- Browser tab
- SEO meta tags
- Open Graph tags

```markdown
---
title: Getting Started with eziwiki
---
```

### description

A brief description used in:

- SEO meta description
- Open Graph description
- Search results

```markdown
---
title: Getting Started
description: Learn how to set up and use eziwiki in 5 minutes
---
```

### tags

Subjects this page belongs to. A file sits in exactly one directory, so the
sidebar can only ever show one arrangement; tags are the other one. A page
belongs to one section and to as many subjects as it touches.

```markdown
---
title: Deploying to Vercel
tags:
  - deployment
  - hosting
---
```

A single tag can be written without the list, and a comma-separated string
works too:

```markdown
tags: deployment
tags: deployment, hosting
```

Every subject gets a page at `/tags/<name>`, and `/tags` lists them all. Tags
are matched case-insensitively — `Setup` and `setup` are one subject, not two —
and the first spelling used is the one shown.

[[hidden-pages|Hidden pages]] are left out. A page kept off the sidebar on
purpose should not reappear in a tag listing, which would turn the tag index
into a way of enumerating exactly what was meant to stay unlisted.

### aliases

Addresses this page used to answer on. A URL is built from a file's path, so
moving `guides/setup.md` to `getting-started/setup.md` changes the published
URL and every bookmark, external link and search result pointing at the old one
stops working. Wiki links survive the move — they resolve by name — but nothing
arriving from outside does.

```markdown
---
title: Setup
aliases:
  - guides/setup
  - old/install-guide
---
```

Each alias is built as a page that forwards to this one, kept out of the
sitemap and marked `noindex`, with its canonical pointing here so any ranking
the old address earned transfers rather than being split.

A single alias can be written without the list:

```markdown
aliases: guides/setup
```

Two mistakes stop the build rather than being resolved quietly: an alias naming
a path a real page occupies, which would make that page unreachable, and the
same alias claimed by two documents, which has no correct answer. Both are
cheaper to find at build time than as a wrong page in production.

Under the [[url-strategies|`hash` strategy]] the alias produces the digest of
the old path — which is exactly what the old URL was.

## Complete Example

```markdown
---
title: API Authentication Guide
description: Learn how to authenticate API requests using OAuth 2.0
---

# API Authentication Guide

This guide covers authentication methods...
```

## Why Use Frontmatter?

### Better SEO

Search engines use title and description for:

- Search result titles
- Meta descriptions
- Social media previews

```markdown
---
title: eziwiki - Beautiful Documentation Made Easy
description: A minimal wiki generator built with Next.js, inspired by Notion and Obsidian
---
```

### Consistent Metadata

Frontmatter ensures every page has proper metadata:

```markdown
---
title: Installation Guide
description: Step-by-step installation instructions for eziwiki
---
```

### Social Sharing

When shared on social media, frontmatter provides:

- Card title
- Card description
- Better preview

## Frontmatter vs Markdown Headings

You can use both:

```markdown
---
title: Getting Started
description: Quick start guide
---

# Getting Started

Welcome to the quick start guide...
```

The frontmatter `title` is used for SEO and metadata, while the Markdown `# Heading` is displayed in the content.

## Optional Frontmatter

Frontmatter is completely optional. If not provided:

- Title defaults to the first `# Heading` in the file
- Description is empty

```markdown
# My Page

This page has no frontmatter, but still works fine!
```

## YAML Syntax

Frontmatter uses YAML syntax:

```yaml
---
# Simple values
title: My Title
description: My description

# Quotes for special characters
title: "Title: With Colon"
description: 'Description with "quotes"'

# Multi-line values
description: |
  This is a multi-line
  description that spans
  multiple lines.
---
```

## Common Patterns

### Documentation Page

```markdown
---
title: API Reference
description: Complete API documentation with examples
---

# API Reference

## Authentication

All API requests require...
```

### Tutorial Page

```markdown
---
title: Building Your First App
description: Step-by-step tutorial for beginners
---

# Building Your First App

In this tutorial, you'll learn...
```

### Guide Page

```markdown
---
title: Deployment Guide
description: Deploy your wiki to production
---

# Deployment Guide

This guide covers deployment to...
```

## Best Practices

### Keep Titles Concise

```markdown
## ✅ Good:

## title: Quick Start Guide

## ❌ Too long:

## title: The Complete and Comprehensive Quick Start Guide for Getting Started with eziwiki
```

### Write Descriptive Descriptions

```markdown
## ✅ Good:

## description: Learn how to install eziwiki and create your first wiki page

## ❌ Too vague:

## description: Installation stuff
```

### Use Proper Capitalization

```markdown
## ✅ Good:

## title: Getting Started with eziwiki

## ❌ Bad:

## title: getting started with eziwiki
```

### Avoid Duplicate Content

Don't repeat the title in the description:

```markdown
## ✅ Good:

title: Installation Guide
description: Step-by-step instructions for installing eziwiki

---

## ❌ Bad:

title: Installation Guide
description: Installation Guide - How to install

---
```

## Validation

eziwiki validates frontmatter at build time. Common errors:

```markdown
## ❌ Invalid YAML syntax:

title: Missing closing quote
description: "Unclosed quote

---

## ❌ Invalid structure:

title
description

---

## ✅ Valid:

title: Correct Title
description: Correct description

---
```

## Next Steps

- [Learn Markdown Basics](/content/markdown-basics)
- [Explore Code Blocks](/content/code-blocks)
- [Configure Your Wiki](/configuration/payload)
