#!/usr/bin/env tsx

/**
 * Stages the files pdf.js fetches at runtime into `public/pdfjs/`.
 *
 * The viewer's code is bundled, but pdf.js also reaches for files as it meets
 * the need for them: a character map for a document that names one of Adobe's
 * predefined encodings, a font program for one that uses a standard face
 * without embedding it, an image codec for a scan. They are fetched by URL, so
 * they have to be served, and nothing but the browser knows which ones a given
 * document will ask for.
 *
 * The worker is staged here too, rather than emitted by the bundler from a
 * `new URL(…)`. Webpack does emit it that way, but as an opaque asset that
 * Next then hands to the minifier — which reads it as a script, meets the
 * `import.meta` every module build contains, and fails the build. Copying it
 * keeps it a file rather than something to be compiled.
 *
 * Nearly four megabytes of them, though, so this runs only when the wiki
 * actually contains a document to view — and clears the directory again when
 * the last one is removed. A wiki with no PDFs deploys exactly what it did
 * before this feature existed.
 *
 * Runs before `next dev` and `next build`. During `dev` that means adding the
 * first PDF to an already-running server needs a restart; the message below
 * says so.
 */

import fs from 'fs/promises';
import path from 'path';

/** Where the files are served from, matching `PDFJS_DATA` in the viewer. */
const TARGET = path.join(process.cwd(), 'public', 'pdfjs');

/** Directories of pdf.js's package that hold runtime-fetched data. */
const NEEDED = ['cmaps', 'standard_fonts', 'iccs', 'wasm'];

/** The worker, which the viewer points pdf.js at by name. */
const WORKER = 'build/pdf.worker.min.mjs';

const PUBLIC_DIR = path.join(process.cwd(), 'public');

/**
 * Reports whether the wiki has anything for the viewer to show.
 *
 * `public/pdfjs` itself is skipped, so the staged files can never be what
 * justifies staging them.
 *
 * @param dir - Directory to search
 * @returns True as soon as one PDF is found
 */
async function hasPdf(dir: string): Promise<boolean> {
  let entries;

  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return false;
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (full === TARGET) continue;
      if (await hasPdf(full)) return true;
      continue;
    }

    if (path.extname(entry.name).toLowerCase() === '.pdf') return true;
  }

  return false;
}

/**
 * Measures a directory tree, for the line this prints.
 *
 * @param dir - Directory to measure
 * @returns Total bytes
 */
async function sizeOf(dir: string): Promise<number> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let total = 0;

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? await sizeOf(full) : (await fs.stat(full)).size;
  }

  return total;
}

async function main() {
  if (!(await hasPdf(PUBLIC_DIR))) {
    await fs.rm(TARGET, { recursive: true, force: true });
    return;
  }

  const source = path.dirname(require.resolve('pdfjs-dist/package.json'));

  // Replaced rather than merged: an upgrade that renames or drops a file would
  // otherwise leave the old one behind to be served forever.
  await fs.rm(TARGET, { recursive: true, force: true });
  await fs.mkdir(TARGET, { recursive: true });

  for (const dir of NEEDED) {
    await fs.cp(path.join(source, dir), path.join(TARGET, dir), { recursive: true });
  }

  await fs.cp(path.join(source, WORKER), path.join(TARGET, path.basename(WORKER)));

  const mb = ((await sizeOf(TARGET)) / 1024 / 1024).toFixed(1);
  console.log(`📄 Staged pdf.js document data in public/pdfjs (${mb} MB, served on demand)`);
  console.log('   Adding the first PDF to a running dev server needs a restart.\n');
}

main().catch((error) => {
  console.error('❌ Failed to stage pdf.js document data:');
  console.error(error);
  process.exit(1);
});
