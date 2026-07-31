---
title: Table of Contents
description: An automatic contents rail with scroll tracking on every page
order: 3
---

# Table of Contents

Every page gets a contents rail on the right, built from its headings. You are
looking at one now — on a wide enough screen.

## What appears

Headings from `h2` to `h4`:

```markdown
# Page Title ← not listed; it is the page, not a section within it

## A section ← listed

### A subsection ← listed, indented

#### A detail ← listed, indented further

##### Too deep ← not listed
```

`h1` is skipped because it names the page as a whole, and the rail already sits
on that page. `h5` and below are skipped to keep the rail readable.

Pages with fewer than two headings get no rail at all — a contents list with one
entry is noise.

## Anchors

Every heading receives an id derived from its text, so each section is directly
linkable:

```markdown
## Getting Started → #getting-started

## What's new in v2 → #whats-new-in-v2
```

Link to one from anywhere:

```markdown
[Jump to setup](#setup)
[From another page](/getting-started/quick-start#prerequisites)
[[quick-start#prerequisites]]
```

[[search|Search results]] link to these anchors too, which is what lets a hit
open at the right section.

## Scroll tracking

The entry for whichever section you are reading is highlighted as you scroll.
The active section is chosen by position — the last heading to pass the top of
the viewport — so a long section stays highlighted after its heading scrolls out
of view.

## Where it appears

The rail shows on screens 1280px and wider. Below that the article takes the
full width; the headings are still in the page and still linkable, just not
listed alongside.

## Generated at build time

The heading list is extracted while your Markdown is compiled, so it ships in
the HTML rather than being assembled by a script after the page loads. Only the
scroll highlighting runs in the browser.

## Next

- [[search]] — find pages by their contents
- [[wiki-links]] — link between pages by name
