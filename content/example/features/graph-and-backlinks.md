---
tags:
  - linking
  - graph
title: Graph & Backlinks
description: See how your pages connect, in both directions
order: 5
---

# Graph & Backlinks

Forward links tell a reader where to go next. They say nothing about how the
page they are on fits into everything else. Backlinks and the graph fill that in.

## Backlinks

Every page ends with the pages that link **to** it — scroll to the bottom of
this one to see them.

The list is built by scanning every page for references, so it covers both
[[wiki-links|wiki links]] and ordinary Markdown links. Nothing to maintain: link
to a page and it gains a backlink.

Pages nothing links to show no panel at all.

## The graph

The [Graph](/graph) page draws the whole site: one node per page, one line per
link.

- **Node size** reflects how many links touch a page, so hubs stand out
- **Hover** a node to dim everything it is not connected to
- **Click** to open the page

The layout is computed from a fixed starting arrangement, so the graph looks the
same on every visit. A graph that rearranges itself each time is impossible to
build any familiarity with.

It is drawn as plain SVG with a small force-directed layout — no charting
library, so nothing extra is downloaded on any other page.

## The neighbourhood of a page

Scroll to the bottom of this page and there is a second, smaller graph: the
pages one link away from this one, in either direction, and the links among
them. The page you are reading is the filled node at its centre.

The site graph answers what the wiki looks like. Past a few dozen pages it
stops answering what is _near here_, which is the question you have while
reading — so that one is drawn per page instead.

The neighbours' own links are kept, not only the ones touching this page.
Without them the view would be a fan of unconnected dots, which says no more
than the backlinks list above it. With them you can see which of the related
pages are related to each other.

Direction is not distinguished here. Looking for what to read next, it matters
that two pages are connected, not which one did the linking — and the backlinks
list already names the ones pointing this way.

A page with nothing linking to or from it gets no graph rather than an empty
box.

## Unresolved links

The graph page lists every link that resolves to no page, with the file it was
written in. The same list is available from the command line:

```bash
npm run check:links
```

See [[validation-testing]] for wiring that into CI.

## What is excluded

[[hidden-pages|Hidden pages]] appear in neither the graph nor any backlink
panel, and links pointing at them are not drawn. An unlisted page cannot be
discovered by reading the graph.

Links to external sites, in-page anchors, and a page linking to itself are not
edges either — the graph is about how _your_ pages relate to one another.

## Building a connected wiki

A graph with no lines in it is telling you something. Some habits that help:

- End each page with a "Next" section pointing at two or three related pages
- Link the first mention of a concept to the page that explains it
- Check the graph occasionally for isolated nodes — pages nothing reaches are
  pages nobody finds

## Next

- [[wiki-links]] — the syntax for linking by name
- [[search]] — the other way readers find pages
