import fs from 'fs';
import path from 'path';
import { cached, contentGeneration, stamp, PUBLIC_DIR } from '../cache';

/**
 * First pages drawn from embedded PDFs at build time.
 *
 * `scripts/build-pdf-posters.ts` renders them and records their shape; this
 * reads what it recorded, so a document embed can ship a real image of its
 * first page. That image is what a reader sees before — and, for most readers,
 * instead of — the megabyte of parser the viewer needs.
 *
 * Server-only: reads the filesystem.
 */

/** Directory posters are written to, relative to `public/`. */
const POSTER_DIR = 'pdf-posters';

/** What the build recorded about one document's poster. */
export interface Poster {
  /** Root-relative URL of the image */
  url: string;
  /** Natural width of the image in pixels */
  width: number;
  /** Natural height of the image in pixels */
  height: number;
  /** Pages in the document it was drawn from */
  pages: number;
}

/** Manifest shape on disk; `source` is the build step's own bookkeeping. */
type Manifest = Record<string, Poster & { source: number }>;

let memo: Manifest | null = null;
const memoStamp = stamp();

/**
 * Reads the poster manifest.
 *
 * Absent when the build step has not run, or ran without a canvas to draw on.
 * That is an ordinary state, not an error: every embed still works, and its
 * first page is drawn in the browser instead.
 *
 * @returns What was recorded, keyed by path relative to `public/`
 */
function getManifest(): Manifest {
  const hit = cached(memo, memoStamp);
  if (hit) return hit;

  try {
    const file = path.join(PUBLIC_DIR, POSTER_DIR, 'index.json');
    memo = JSON.parse(fs.readFileSync(file, 'utf-8')) as Manifest;
  } catch {
    memo = {};
  }

  memoStamp.at = contentGeneration();
  return memo;
}

/**
 * Finds the poster drawn for a document.
 *
 * @param assetPath - Path relative to `public/`, as the asset index records it
 * @returns The poster, or null when none was drawn
 *
 * @example
 * ```typescript
 * getPoster('documents/sample.pdf')?.url; // '/pdf-posters/documents/sample.pdf.webp'
 * ```
 */
export function getPoster(assetPath: string): Poster | null {
  const entry = getManifest()[assetPath];
  if (!entry) return null;

  return { url: entry.url, width: entry.width, height: entry.height, pages: entry.pages };
}
