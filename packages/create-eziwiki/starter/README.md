# My Wiki

Built with [eziwiki](https://github.com/i3months/eziwiki).

## Develop

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Write

Drop Markdown files into `content/`. Every file becomes a page automatically —
folders become sidebar sections. See `content/guides/writing.md` for what a page
can contain.

Set the site title, theme, and URL style in `payload/config.ts`.

## Build

```bash
npm run build
```

The result is a fully static site in `out/`, deployable to GitHub Pages,
Netlify, Vercel, S3, or any static host.

## Commands

```bash
npm run dev              # Development server
npm run build            # Static production build
npm run check:links      # Report links that point at no page
npm run show-urls        # List every page and its URL
npm test                 # Run the test suite
```
