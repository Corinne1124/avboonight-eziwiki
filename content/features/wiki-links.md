---
title: Wiki Links
description: Link to any page by name with [[double bracket]] syntax
order: 4
---

# Wiki Links

Write `[[page]]` to link to another page without knowing where it lives in the
tree.

## The four forms

```markdown
[[quick-start]] → links, labelled with the target's own title
[[quick-start|start here]] → links, labelled "start here"
[[quick-start#prerequisites]] → links to a section
[[quick-start#prerequisites|Step one]] → both
```

An anchor with no target points within the current page:

```markdown
[[#the-four-forms]]
```

## Embedding an image

A leading `!` shows the target instead of linking to it, the way a vault does:

```markdown
![[sample.jpg]] → embeds public/images/docs/sample.jpg
![[sample.jpg|Architecture]] → the label becomes the alt text
![[images/docs/sample.jpg]] → the full path, when the name is not unique
```

The file is looked up under `public/`, by bare filename or by the path
relative to `public/`. A bare name is enough as long as only one file carries
it; when several do, the embed resolves to nothing rather than picking one, and
you write the path instead. The same rule the [[#ambiguity-is-refused-not-guessed|link resolver]] uses.

Here is one, embedded by name:

![[sample.jpg|A sample image embedded with a wiki link]]

Embeds and links index differently. `[[a-page]]` is an edge in the
[[graph-and-backlinks|graph]]; `![[a-file.png]]` is not, because a file is not
a page.

## Including another page

The same `!` on a page rather than a file pulls that page's text in, so a
passage lives in one document and appears wherever it is needed:

```markdown
![[quick-start]] → the whole page
![[quick-start#prerequisites]] → just that section
```

A section runs from its heading to the next one at the same level or above.
Included text is boxed and carries a link back to the page it is maintained on,
so a reader can tell borrowed text from this page's own.

Here is the Prerequisites section of [[quick-start]], included rather than
copied:

![[quick-start#prerequisites]]

Four rules keep this predictable:

- **The embed must be alone in its paragraph.** Headings and lists cannot sit
  inside a sentence, so an embed with prose beside it stays a link.
- **A page cannot include itself,** directly or through a chain. The reference
  stays as a link.
- **Nesting stops after three levels.** Deeper is more often a mistake than an
  intent.
- **Included headings stay out of the table of contents.** It describes the page
  you are on, not the pages it borrows from.

An embed naming neither a file nor a page falls back to a link, so nothing you
write disappears.

## How a target is resolved

Three lookups, in order. The first that matches wins:

| Order | Matches on | Example                           |
| ----- | ---------- | --------------------------------- |
| 1     | Full path  | `[[getting-started/quick-start]]` |
| 2     | File name  | `[[quick-start]]`                 |
| 3     | Page title | `[[Quick Start]]`                 |

Matching ignores case, a leading slash, and a trailing `.md`, so
`[[/Getting-Started/Quick-Start.md]]` resolves the same as `[[quick-start]]`.

### Ambiguity is refused, not guessed

If a shorthand matches more than one page — say two folders both contain
`overview.md` — the link is **not** resolved. Silently picking one would make
the destination depend on the order files happen to be scanned in, which is the
kind of bug nobody notices until the wrong page ships.

Use the full path to disambiguate:

```markdown
[[api/overview]] instead of [[overview]]
```

## Broken links are visible

A target that resolves to nothing renders as marked-up text rather than an
anchor. Writing `[[a page that does not exist]]` produces:

> A link to
> <span class="ezw-broken-link" title="Unresolved link: a page that does not exist">a page that does not exist</span>
> looks like this.

A link that goes nowhere is worse than visibly broken text, because it looks
clickable and silently is not. Hover it to see the target that failed.

<!-- Rendered as HTML rather than as a real wiki link, so that this page can
     demonstrate a dangling reference without contributing one to the site. -->

List every unresolved link across the whole site:

```bash
npm run check:links
```

## Wiki links inside code are left alone

Only prose is scanned, so documentation that explains the syntax — like this
page — can show it literally:

```markdown
[[this stays as written]]
```

Inline code works the same way: `[[quick-start]]` here is untouched.

## Ordinary Markdown links still work

Wiki links are a convenience, not a replacement:

```markdown
[Quick Start](/getting-started/quick-start)
[Quick Start](getting-started/quick-start.md)
```

Both resolve to the same URL under either [[url-strategies|URL strategy]]. Use
whichever reads better; both count toward [[graph-and-backlinks|backlinks]].

## Why link by name

Wiki links survive reorganisation. Move `quick-start.md` into a different folder
and every `[[quick-start]]` still resolves — only links written as full paths
need updating.

## Next

- [[graph-and-backlinks]] — see what links where
- [[validation-testing]] — catch broken links before you deploy
