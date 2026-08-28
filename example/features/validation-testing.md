---
title: Validation & Testing
description: Catch broken configuration and dangling links before you deploy
order: 9
---

# Validation & Testing

Three checks run as part of `npm run build`, so problems surface at build time
rather than in front of a reader.

## Wiki health

The same command reports two things a link check cannot, because both are
about links that are _absent_:

```
🔗 Links OK — 102 links across 25 pages

⚠️  3 orphaned pages — nothing links here, so a reader can only arrive from the sidebar
     content/examples/personal-wiki.md
     content/examples/knowledge-base.md
     content/examples/api-docs.md

⚠️  1 dead end — no links out, so a reader arrives with nowhere to go
     content/deployment/vercel.md
```

An **orphan** is a page nothing points at. It is in the sidebar, so it is not
lost, but no one reading the wiki will ever stumble into it. A **dead end** is
a page with no links out: a reader arrives and the only way on is the back
button.

Neither is an error, and neither ever fails the build — a correct wiki can
have both, and a reference page with nothing to say next is legitimate. They
are reported because neither is visible from inside a single document. You
notice a broken link the moment you click it; you never notice the page nobody
links to.

The page a reader starts at is never called an orphan. Nothing needs to point
at the entrance.

This falls out of treating documents as a [[graph-and-backlinks|graph]] rather
than a tree. In a tree, being in the sidebar is the whole of belonging, and
"orphan" has no meaning.

## Config validation

```bash
npm run validate:payload
```

```
🔍 Validating payload configuration...

✅ Payload validation passed!
```

`payload/config.ts` is checked against a JSON Schema. It catches:

- missing required fields (`global.title`, `global.description`)
- malformed colours — theme values must be `#rrggbb`
- an invalid `urlStrategy` — only `path` and `hash` are accepted
- navigation entries missing a `name`, or nested wrongly

A failure stops the build immediately, before anything is rendered.

### Example failure

```
❌ Payload validation failed:
  - /global/title must NOT have fewer than 1 characters
```

## Link checking

```bash
npm run check:links
```

```
🔗 Links OK — 61 links across 21 pages
```

Every [[wiki-links|wiki link]] and internal Markdown link is resolved against
the content tree. Two things can go wrong, and they are reported differently
because the fix is in different places.

A link matching several pages is a fault in the link, so it is reported where
it was written:

```
🔗 1 unresolved link

  Ambiguous — use the full path to say which page is meant:

    content/guides/api.md
      [[overview]] matches api/overview, guides/overview
```

A link matching nothing is not really a fault at all. Someone wrote it while
writing about something else, because that is when they knew the page was
needed. Those are reported the other way round — by the page being asked for:

```
  Wanted — 1 page linked to but not written, most-wanted first:

    [[Deploying to Fly]] — wanted by 2 pages
      content/deployment/static-export.md
      content/deployment/vercel.md
      npm run new deploying-to-fly
```

Two pages asking for the same one is the clearest statement a wiki can make
about what to write next, and it costs nothing to collect — the links were
written by whoever needed the page. Spelling does not split the count:
`[[Deploying to Fly]]` and `[[deploying to fly]]` are one page wanted twice,
because one file answers both.

## Writing what is wanted

The last line of each entry is the whole of it:

```bash
npm run new deploying-to-fly
```

The file is created with its frontmatter, in the directory the path names, and
is published on the next build. A title works as well as a path:

```bash
npm run new "Deploying to Fly"                    # → deploying-to-fly.md
npm run new guides/setup -- --title "Set it up"   # npm needs the `--`
```

A target written as a title keeps its own capitalisation, which is what makes
the link that asked for it resolve — it matches on the title. An existing file
is never overwritten.

## Failing on purpose

By default the check **reports without failing**. A dangling link in one page is
not a reason to block a deploy of the other twenty, and content is often written
before the page it references exists.

To make it fatal — in CI, for instance:

```bash
npm run check:links -- --strict
```

The [Graph](/graph) page lists the same wanted pages, so the gap is visible from
the wiki as well as from the terminal.

## Tests

```bash
npm test           # once
npm run test:watch # on change
```

The suite covers the engine: content discovery, navigation assembly, URL
resolution under both strategies, the Markdown pipeline, wiki-link parsing,
search indexing and ranking, and the graph layout.

It also asserts against this site's own content — that every section in the
search index points at a real anchor, and that no page contains a dangling
link — so the tests fail if the documentation drifts from the code.

## Types

```bash
npm run type-check
```

`payload/config.ts` is typed, so most configuration mistakes are caught in your
editor before any script runs. If a field is not in the `Payload` type, it is
not a real option.

## Formatting and lint

```bash
npm run lint     # ESLint, with --fix
npm run format   # Prettier
```

## In CI

A workflow that runs everything:

```yaml
- run: npm ci
- run: npm run type-check
- run: npm run lint
- run: npm test
- run: npm run check:links -- --strict
- run: npm run build
```

## Next

- [[payload]] — what the config can contain
- [[graph-and-backlinks]] — see unresolved links in context
- [[static-export]] — deploying the result
