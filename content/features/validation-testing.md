---
title: Validation & Testing
description: Catch broken configuration and dangling links before you deploy
order: 9
---

# Validation & Testing

Three checks run as part of `npm run build`, so problems surface at build time
rather than in front of a reader.

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
the content tree. Anything pointing at no page is reported with the file it was
written in:

```
🔗 2 unresolved links:

  content/guides/setup.md
    [[instalation]] matches no page

  content/guides/api.md
    [[overview]] is ambiguous — matches api/overview, guides/overview
    Use the full path to disambiguate.
```

By default this **reports without failing**. A dangling link in one page is not
a reason to block a deploy of the other twenty, and content is often written
before the page it references exists.

To make it fatal — in CI, for instance:

```bash
npm run check:links -- --strict
```

The same list appears at the bottom of the [Graph](/graph) page.

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
