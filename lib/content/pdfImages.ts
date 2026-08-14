import fs from 'fs';
import path from 'path';
import { cached, contentGeneration, stamp, PUBLIC_DIR } from '../cache';

/**
 * Pages drawn from embedded PDFs at build time.
 *
 * `scripts/build-pdf-images.ts` draws them and records what it drew; this
 * reads that record. Every document has at least its first page, which is what
 * an embed shows before — and, for most readers, instead of — the megabyte of
 * parser the viewer needs. A document the payload named as a scan has all of
 * them, and is shown as those images rather than in a viewer.
 *
 * Server-only: reads the filesystem.
 */

/** Directory images are written to, relative to `public/`. */
const IMAGE_DIR = 'pdf-images';

/** One drawn page. */
export interface DrawnPage {
  /** Root-relative URL of the image */
  url: string;
  /** Natural width in pixels */
  width: number;
  /** Natural height in pixels */
  height: number;
}

/** What the build drew for one document. */
export interface PdfImages {
  /** `poster` is the first page only; `raster` is all of them */
  mode: 'poster' | 'raster';
  /** Pages in the document, however many were drawn */
  pages: number;
  /** The images, in page order; never empty */
  images: DrawnPage[];
}

/** Manifest shape on disk; `source` is the build step's own bookkeeping. */
type Manifest = Record<string, PdfImages & { source: number }>;

let memo: Manifest | null = null;
const memoStamp = stamp();

/**
 * Reads the manifest.
 *
 * Absent when the build step has not run, or ran without a canvas to draw on.
 * That is an ordinary state, not an error: every embed still works, and its
 * pages are drawn in the browser instead.
 *
 * @returns What was recorded, keyed by path relative to `public/`
 */
function getManifest(): Manifest {
  const hit = cached(memo, memoStamp);
  if (hit) return hit;

  try {
    const file = path.join(PUBLIC_DIR, IMAGE_DIR, 'index.json');
    memo = JSON.parse(fs.readFileSync(file, 'utf-8')) as Manifest;
  } catch {
    memo = {};
  }

  memoStamp.at = contentGeneration();
  return memo;
}

/**
 * Finds what was drawn for a document.
 *
 * @param assetPath - Path relative to `public/`, as the asset index records it
 * @returns The pages, or null when none were drawn
 *
 * @example
 * ```typescript
 * getPdfImages('documents/sample.pdf')?.mode; // 'poster'
 * getPdfImages('scans/report.pdf')?.images.length; // 12
 * ```
 */
export function getPdfImages(assetPath: string): PdfImages | null {
  const entry = getManifest()[assetPath];
  if (!entry?.images?.length) return null;

  return { mode: entry.mode, pages: entry.pages, images: entry.images };
}
