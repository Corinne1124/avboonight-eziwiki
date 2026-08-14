#!/usr/bin/env tsx

/**
 * Renders the first page of every embedded PDF to a WebP poster.
 *
 * A document embed used to cost every reader of the page the viewer: pdf.js is
 * a megabyte of parser, and it was fetched to draw a first page that most
 * readers only glance at. The poster is that first page, drawn once here, so
 * the page ships an ordinary image and the parser is fetched only by a reader
 * who actually opens the document.
 *
 * Only the first page. Rasterising a whole document was measured and refused:
 * a six-page text PDF of 33 kB became 1.3 MB of WebP — thirty-eight times the
 * file it replaces — and the pages lost their text along the way, so no
 * selection, no in-page search, and nothing for a screen reader. One page as a
 * preview is the part of that idea that pays.
 *
 * Runs before `next dev` and `next build`, and skips a poster whose PDF has
 * not changed since it was drawn.
 */

import fs from 'fs/promises';
import path from 'path';

/** Where posters are written, relative to `public/`. */
const POSTER_DIR = 'pdf-posters';

/** Manifest the render pipeline reads to find a poster and its shape. */
const MANIFEST = 'index.json';

/**
 * Width posters are drawn at, in pixels.
 *
 * The article column tops out near 830 CSS pixels, so this is a little over
 * 1.4× the widest a poster is ever shown at — enough that it stays sharp on a
 * dense screen without paying for a full 2× of a preview the reader clicks
 * through to see properly.
 */
const POSTER_WIDTH = 1200;

/** WebP quality. High enough that small type stays crisp. */
const QUALITY = 82;

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const TARGET = path.join(PUBLIC_DIR, POSTER_DIR);

/** Directories under `public/` that hold generated data rather than content. */
const SKIP = new Set([POSTER_DIR, 'pdfjs', 'fonts']);

/** What the manifest records about one document. */
interface PosterEntry {
  /** Root-relative URL of the poster image */
  url: string;
  /** Poster dimensions, so the page reserves the right box before it loads */
  width: number;
  height: number;
  /** Pages in the document, so the header can say so before pdf.js is loaded */
  pages: number;
  /** Modification time of the PDF this was drawn from */
  source: number;
}

/**
 * Collects every PDF a page could embed.
 *
 * @param dir - Directory to search
 * @param found - Accumulator of paths relative to `public/`
 * @returns The accumulator
 */
async function findPdfs(dir: string, found: string[] = []): Promise<string[]> {
  let entries;

  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return found;
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (dir === PUBLIC_DIR && SKIP.has(entry.name)) continue;
      await findPdfs(full, found);
      continue;
    }

    if (path.extname(entry.name).toLowerCase() === '.pdf') {
      found.push(path.relative(PUBLIC_DIR, full).split(path.sep).join('/'));
    }
  }

  return found;
}

/**
 * Loads the canvas implementation, or reports that there is none.
 *
 * `@napi-rs/canvas` is a development dependency rather than a required one: it
 * carries a native binary, and a wiki with no PDFs in it should not be asked
 * to download one. Without it the posters are simply not drawn and the viewer
 * falls back to fetching pdf.js when a document is first shown — slower for
 * that reader, but not broken for anyone.
 *
 * @returns The module, or null when it is not installed
 */
async function loadCanvas(): Promise<typeof import('@napi-rs/canvas') | null> {
  try {
    return await import('@napi-rs/canvas');
  } catch {
    return null;
  }
}

/**
 * Reads the manifest written by a previous run.
 *
 * @returns What was recorded, or an empty map
 */
async function readManifest(): Promise<Record<string, PosterEntry>> {
  try {
    return JSON.parse(await fs.readFile(path.join(TARGET, MANIFEST), 'utf-8'));
  } catch {
    return {};
  }
}

async function main() {
  const pdfs = await findPdfs(PUBLIC_DIR);

  if (pdfs.length === 0) {
    await fs.rm(TARGET, { recursive: true, force: true });
    return;
  }

  const canvasLib = await loadCanvas();

  if (!canvasLib) {
    console.log(`📄 ${pdfs.length} PDF(s) embedded, but no first-page posters were drawn.`);
    console.log('   Install the renderer to have them:  npm i -D @napi-rs/canvas');
    console.log('   Without it the documents still open — the viewer draws the first');
    console.log('   page in the browser, which costs the reader the parser to do it.\n');
    return;
  }

  // pdf.js builds its paths from whatever `Path2D` and `DOMMatrix` it finds as
  // globals, and the context that has to fill them belongs to the canvas
  // library. Seeding the globals from that same library is what makes the two
  // agree; without it every render throws on the first filled path.
  const globals = globalThis as Record<string, unknown>;
  globals.Path2D = canvasLib.Path2D;
  globals.DOMMatrix = canvasLib.DOMMatrix;
  globals.ImageData = canvasLib.ImageData;

  // The legacy build, because this is Node: the modern one reaches for browser
  // globals at import time and never gets as far as being asked to render.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const standardFontDataUrl = path.join(
    path.dirname(require.resolve('pdfjs-dist/package.json')),
    'standard_fonts/',
  );

  const previous = await readManifest();
  const manifest: Record<string, PosterEntry> = {};

  let drawn = 0;
  let bytes = 0;

  await fs.mkdir(TARGET, { recursive: true });

  for (const relative of pdfs) {
    const source = path.join(PUBLIC_DIR, relative);
    const modified = (await fs.stat(source)).mtimeMs;
    const posterPath = `${relative}.webp`;
    const destination = path.join(TARGET, posterPath);

    const cached = previous[relative];

    // Unchanged since it was drawn, and the file is still there: keep it.
    if (cached?.source === modified) {
      try {
        bytes += (await fs.stat(destination)).size;
        manifest[relative] = cached;
        continue;
      } catch {
        // Recorded but missing; fall through and draw it again.
      }
    }

    const data = new Uint8Array(await fs.readFile(source));

    try {
      const doc = await pdfjs.getDocument({ data, standardFontDataUrl }).promise;
      const page = await doc.getPage(1);

      const natural = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: POSTER_WIDTH / natural.width });
      const width = Math.floor(viewport.width);
      const height = Math.floor(viewport.height);

      const canvas = canvasLib.createCanvas(width, height);
      const context = canvas.getContext('2d');

      // A PDF page is transparent where nothing is drawn, and WebP keeps that
      // — the page would be shown against whatever is behind it, which in the
      // dark theme is nearly black text on nearly black paper.
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);

      // pdf.js types its render target as the DOM's canvas, which is what it
      // meets in a browser. Here it is the native one, which answers every
      // call pdf.js actually makes and none of the events and streams the DOM
      // interface also declares.
      await page.render({
        canvas: canvas as unknown as HTMLCanvasElement,
        canvasContext: context as unknown as CanvasRenderingContext2D,
        viewport,
      }).promise;

      const encoded = await canvas.encode('webp', QUALITY);

      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, encoded);

      manifest[relative] = {
        url: `/${POSTER_DIR}/${posterPath}`,
        width,
        height,
        pages: doc.numPages,
        source: modified,
      };

      await doc.destroy();

      drawn += 1;
      bytes += encoded.length;
    } catch (error) {
      // One unreadable document is not a reason to fail the build. It simply
      // gets no poster, and its viewer draws the first page in the browser.
      console.warn(`⚠️  Could not draw a poster for public/${relative}: ${String(error)}`);
    }
  }

  // Posters whose PDF is gone would otherwise be served forever.
  for (const stale of Object.keys(previous)) {
    if (manifest[stale]) continue;
    await fs.rm(path.join(TARGET, `${stale}.webp`), { force: true });
  }

  await fs.writeFile(path.join(TARGET, MANIFEST), JSON.stringify(manifest), 'utf-8');

  const kb = (bytes / 1024).toFixed(0);
  const reused = pdfs.length - drawn;
  console.log(
    `📄 PDF posters: ${drawn} drawn${reused > 0 ? `, ${reused} unchanged` : ''} (${kb} kB)\n`,
  );
}

main().catch((error) => {
  console.error('❌ Failed to build PDF posters:');
  console.error(error);
  process.exit(1);
});
