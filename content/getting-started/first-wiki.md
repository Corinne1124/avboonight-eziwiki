---
title: Your First Wiki
description: Create your first wiki page from scratch
order: 3
---

# Your First Wiki

Let's create your first wiki page from scratch!

## Step 1: Create a Markdown File

Create a new file in the `content/` directory:

```bash
# Create a new file
touch content/my-first-page.md
```

## Step 2: Add Frontmatter

Open the file and add frontmatter at the top:

```markdown
---
title: My First Page
description: This is my first wiki page
---
```

Frontmatter is optional but recommended for better SEO and navigation.

## Step 3: Write Content

Add your content using Markdown:

```markdown
---
title: My First Page
description: This is my first wiki page
---

# My First Page

Welcome to my first wiki page!

## What I Learned Today

- How to create a wiki page
- How to use Markdown
- How to add frontmatter

## Code Example

Here's a simple JavaScript function:

\`\`\`javascript
function greet(name) {
return `Hello, ${name}!`;
}

console.log(greet('World'));
\`\`\`

## Next Steps

I'm going to learn more about [Markdown basics](/content/markdown-basics).
```

## Step 4: View Your Page

Save the file and go to <http://localhost:3000>. **That is it** — the page is
already in the sidebar under a section named after its folder, and already
searchable.

There is no navigation array to update. Every Markdown file under `content/` is
published automatically.

## Organizing Content

### Create Folders

Folders become sidebar sections:

```bash
mkdir -p content/guides
touch content/guides/getting-started.md
touch content/guides/advanced.md
```

Both pages appear immediately, grouped under a **Guides** section.

### Name and Order a Section

To control how a folder is presented, add a `_meta.json` beside its pages:

```json
{
  "name": "📖 Guides",
  "order": 1,
  "color": "#dbeafe"
}
```

### Order Pages

Use `order` in each page's frontmatter — lower comes first:

```markdown
---
title: Getting Started
order: 1
---
```

Pages without an `order` sort after those that have one, alphabetically.

### Take Manual Control

If you want a structure the folders cannot express, add a `navigation` array to
`payload/config.ts`. It does not have to list everything — pages it omits are
still discovered and appended. See [[navigation]].

## Tips for Great Wiki Pages

### Use Clear Headings

```markdown
# Main Title (H1)

## Section (H2)

### Subsection (H3)
```

### Add Code Blocks

```markdown
\`\`\`typescript
const greeting: string = 'Hello, World!';
\`\`\`
```

### Link Between Pages

```markdown
Check out [another page](/guides/getting-started).
```

### Add Lists

```markdown
- Bullet point 1
- Bullet point 2
  - Nested point

1. Numbered item 1
2. Numbered item 2
```

### Include Images

```markdown
![Alt text](/images/screenshot.png)
```

## Common Patterns

### Documentation Page

```markdown
---
title: API Reference
description: Complete API documentation
---

# API Reference

## Authentication

All API requests require authentication...

## Endpoints

### GET /api/users

Returns a list of users...
```

### Tutorial Page

```markdown
---
title: Building Your First App
description: Step-by-step tutorial
---

# Building Your First App

In this tutorial, you'll learn...

## Prerequisites

- Node.js installed
- Basic JavaScript knowledge

## Step 1: Setup

First, create a new project...
```

### Reference Page

```markdown
---
title: Configuration Options
description: All available configuration options
---

# Configuration Options

## Global Settings

### title

- Type: `string`
- Required: Yes
- Description: Site title

### description

- Type: `string`
- Required: No
- Description: Site description
```

## Next Steps

- [Learn Markdown basics](/content/markdown-basics)
- [Explore configuration options](/configuration/payload)
- [Customize your theme](/configuration/theme)

Congratulations! You've created your first wiki page. 🎉
