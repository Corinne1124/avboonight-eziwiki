---
title: Markdown Basics
description: Learn Markdown syntax for writing wiki content
order: 1
---

# Markdown Basics

eziwiki supports full GitHub Flavored Markdown (GFM). This guide covers all the syntax you need.

## Headings

```markdown
# Heading 1

## Heading 2

### Heading 3

#### Heading 4

##### Heading 5

###### Heading 6
```

## Text Formatting

```markdown
**Bold text**
_Italic text_
**_Bold and italic_**
~~Strikethrough~~
`Inline code`
```

**Bold text**
_Italic text_
**_Bold and italic_**
~~Strikethrough~~
`Inline code`

## Lists

### Unordered Lists

```markdown
- Item 1
- Item 2
  - Nested item 2.1
  - Nested item 2.2
- Item 3
```

- Item 1
- Item 2
  - Nested item 2.1
  - Nested item 2.2
- Item 3

### Ordered Lists

```markdown
1. First item
2. Second item
3. Third item
   1. Nested item 3.1
   2. Nested item 3.2
```

1. First item
2. Second item
3. Third item
   1. Nested item 3.1
   2. Nested item 3.2

### Task Lists

```markdown
- [x] Completed task
- [ ] Incomplete task
- [ ] Another task
```

- [x] Completed task
- [ ] Incomplete task
- [ ] Another task

## Links

```markdown
[Link text](https://example.com)
[Link with title](https://example.com 'Title text')
[Internal link](/getting-started/quick-start)
```

[Link text](https://example.com)
[Link with title](https://example.com 'Title text')
[Internal link](/getting-started/quick-start)

## Images

```markdown
![Alt text](/images/screenshot.png)
![Alt text with title](/images/screenshot.png 'Image title')
```

## Code Blocks

### Inline Code

```markdown
Use `const` instead of `var` in JavaScript.
```

Use `const` instead of `var` in JavaScript.

### Code Blocks with Syntax Highlighting

````markdown
```javascript
function greet(name) {
  return `Hello, ${name}!`;
}
```
````

```javascript
function greet(name) {
  return `Hello, ${name}!`;
}
```

See [Code Blocks](/content/code-blocks) for more details.

## Blockquotes

```markdown
> This is a blockquote.
> It can span multiple lines.
>
> > Nested blockquote
```

> This is a blockquote.
> It can span multiple lines.
>
> > Nested blockquote

## Tables

```markdown
| Header 1 | Header 2 | Header 3 |
| -------- | -------- | -------- |
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
```

| Header 1 | Header 2 | Header 3 |
| -------- | -------- | -------- |
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |

### Alignment

```markdown
| Left | Center | Right |
| :--- | :----: | ----: |
| L1   |   C1   |    R1 |
| L2   |   C2   |    R2 |
```

| Left | Center | Right |
| :--- | :----: | ----: |
| L1   |   C1   |    R1 |
| L2   |   C2   |    R2 |

## Horizontal Rules

```markdown
---
---

---
```

---

## HTML in Markdown

You can use HTML tags in Markdown:

```markdown
<div style="color: red;">
  This text is red.
</div>

<details>
  <summary>Click to expand</summary>
  Hidden content here.
</details>
```

<details>
  <summary>Click to expand</summary>
  Hidden content here.
</details>

## Escaping Characters

Use backslash to escape special characters:

```markdown
\*Not italic\*
\[Not a link\]
\`Not code\`
```

\*Not italic\*
\[Not a link\]
\`Not code\`

## Line Breaks

Two spaces at the end of a line create a line break:

```markdown
First line  
Second line
```

Or use a blank line for a paragraph break:

```markdown
First paragraph

Second paragraph
```

## Footnotes

```markdown
Here's a sentence with a footnote[^1].

[^1]: This is the footnote content.
```

## Emoji

Use emoji shortcodes:

```markdown
:smile: :heart: :rocket: :tada:
```

Or use Unicode emoji directly:

```markdown
😊 ❤️ 🚀 🎉
```

😊 ❤️ 🚀 🎉

## Callouts

A blockquote opening with `[!KIND]` becomes a callout. The syntax is GitHub's
and Obsidian's alike, so a document written for either renders here, and one
written here still reads as an ordinary quote anywhere that does not know the
convention.

```markdown
> [!NOTE]
> Useful information.

> [!WARNING] Mind the gap
> A title on the marker line replaces the default.

> [!TIP]- Optional detail
> A trailing `-` folds it away; `+` starts it open.
```

> [!NOTE]
> Useful information a reader should not miss.

> [!WARNING] Mind the gap
> A title on the marker line replaces the default one.

> [!TIP]- Optional detail
> Folded with a trailing `-`. This is a `<details>` element, so it opens and
> closes without any script.

Five kinds carry their own colour — `note`, `tip`, `important`, `warning` and
`caution`. Obsidian's longer list is accepted too and maps onto the nearest of
them, so a vault keeps its formatting: `danger` reads as `caution`, `success`
as `tip`, `question` as `important`.

An unrecognised kind stays an ordinary blockquote rather than being rendered as
something it is not. Everything inside a callout behaves as it does outside —
links, [[wiki-links|wiki links]], and code all work normally.

## Best Practices

### Use Descriptive Link Text

```markdown
✅ Good: [Read the installation guide](/getting-started/installation)
❌ Bad: [Click here](/getting-started/installation)
```

### Keep Lines Short

Break long lines for better readability:

```markdown
✅ Good:
This is a long paragraph that has been broken into
multiple lines for better readability in the source.

❌ Bad:
This is a long paragraph that goes on and on without any line breaks making it hard to read in the source file.
```

### Use Consistent Formatting

```markdown
✅ Good:

- Item 1
- Item 2
- Item 3

❌ Bad:

- Item 1

* Item 2

- Item 3
```

### Add Alt Text to Images

```markdown
✅ Good: ![Dashboard screenshot showing user analytics](/images/dashboard.png)
❌ Bad: ![](/images/dashboard.png)
```

## Next Steps

- [Learn about Frontmatter](/content/frontmatter)
- [Explore Code Blocks](/content/code-blocks)
- [Create Your First Wiki](/getting-started/first-wiki)
