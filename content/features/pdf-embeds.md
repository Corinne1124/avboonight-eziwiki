---
tags:
  - markdown
  - documents
title: PDF Embeds
description: Show a PDF inside a page with a viewer that follows the theme
order: 10
---

# PDF Embeds

Drop a PDF into `public/` and embed it the way you would embed an image:

```markdown
![[sample.pdf]]
![[sample.pdf|The handbook]] → the label names it in the header
![[documents/sample.pdf]] → the full path, when the name is not unique
```

The file is resolved by the same rule as any other embed — bare filename or
path relative to `public/`, and an ambiguous name resolves to nothing rather
than to a guess. See [[wiki-links#embedding-an-image]].

Here is one:

![[sample.pdf]]

## What the build emits

Nothing but a link:

```html
<figure class="ezw-pdf" data-ezw-pdf data-name="sample.pdf" data-size="3976">
  <a class="ezw-pdf__fallback" href="/documents/sample.pdf" download>sample.pdf</a>
</figure>
```

The viewer is mounted into that figure in the browser, and pdf.js — a megabyte
of parser — is fetched only once a page turns out to have a document on it. A
page without one is exactly as heavy as it was before.

That ordering is also why the fallback is a real link rather than a placeholder:
without script, or before the viewer loads, or if it fails to, a reader is given
the file itself.

## Where it has to stand

An embed alone in its paragraph becomes the viewer. Written mid-sentence it
becomes a link to the file instead — a viewer is a block, and a block cannot sit
inside a sentence. So this:

```markdown
The details are in ![[sample.pdf|the handbook]].
```

reads as prose, with a download link where the embed was.

## Reading it

The pages are drawn as you reach them rather than all at once, so a
hundred-page document opens as fast as a one-page one. The page counter follows
the scroll, so it says where you are rather than where you last clicked.

Zoom is a multiple of the width of the column the document was embedded in —
100% means fitted, not actual size — so the fit survives a resize or a trip to
full screen, and the reader's own zoom survives with it.

## What gets deployed

pdf.js fetches data files as it meets the need for them: a character map for a
document that names one of Adobe's predefined encodings, a font program for one
that uses a standard face without embedding it, an image codec for a scan.
`npm run build` stages them into `public/pdfjs/` — but only when the wiki
actually contains a PDF, so a wiki without one deploys nothing extra.

> [!NOTE]
> Adding the first PDF to an already-running `npm run dev` needs a restart, so
> that the staging step runs.
