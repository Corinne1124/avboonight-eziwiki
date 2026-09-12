import fs from 'fs';
import path from 'path';

/**
 * Whether derived data may be memoised for the lifetime of the process.
 *
 * Everything the site renders is derived from the source directories below.
 * During a build they never change, so scanning and rendering once and reusing
 * the result is pure win.
 *
 * Test runs keep it on: content is fixed there too, and the memoisation
 * behaviour is itself something the tests assert.
 */
export const CACHE_DERIVED_CONTENT = process.env.NODE_ENV !== 'development';

/**
 * The two directories derived data is read from.
 *
 * Defined here and imported everywhere else — including by the registry and
 * the asset index, which are what read them — so that a root can only ever be
 * renamed in one place. Defining them at the readers instead would leave this
 * module watching a directory nobody else was looking at, which is precisely
 * the kind of quiet divergence a cache signature must not have.
 */
export const CONTENT_DIR = path.join(process.cwd(), 'content');
export const PUBLIC_DIR = path.join(process.cwd(), 'public');

/**
 * Top-level directories under `public/` that no derived data reads.
 *
 * The asset index skips them (a font is not something `![[…]]` should
 * resolve to), so the signature skips them too: the point of the signature is
 * to change exactly when what the memos read changes, and `public/fonts` can
 * churn without any memo caring.
 *
 * `pdfjs` holds the character maps and font programs the document viewer
 * fetches — some two hundred files, staged by a build step. Walking them on
 * every signature check would cost more than everything else here put
 * together, and not one of them is something a page can embed.
 *
 * `pdf-images` holds pages drawn from the PDFs, and skipping it is
 * load-bearing rather than an economy: they are `.webp`, so indexing them
 * would let `![[manual.pdf.1.webp]]` resolve to a generated file, and they are
 * derived from documents the signature is already watching.
 */
export const PUBLIC_SKIP_DIRS = new Set(['fonts', 'pdfjs', 'pdf-images']);

/**
 * Generated files directly under `public/` that no source signature contains.
 *
 * The directories above are skipped for the same reason, but these sit beside
 * the real assets rather than in a directory of their own. Leaving one in the
 * signature is a feedback loop with a one-run delay: a build step writes its
 * output, the next run notices the output it wrote, decides its input has
 * changed, and rebuilds — forever, for a reason that is its own last run.
 *
 * `search-index.json` is written by `build:search` and `index.json` by
 * `build:pdf-images`. The second is the PDF manifest, which the generation
 * reads deliberately — so it is added back there, and only there, rather than
 * being part of what the sources are said to consist of.
 */
export const PUBLIC_SKIP_FILES = new Set(['search-index.json', 'index.json']);

const SOURCE_DIRS = [CONTENT_DIR, PUBLIC_DIR];

/**
 * How long a signature is trusted before the files are inspected again.
 *
 * A single page render asks for the registry several hundred times, and
 * stating the tree for each of them would replace one kind of waste with a
 * smaller one. Nothing on disk changes during a render, so the answer is
 * reused for a window far shorter than the gap between saving a file and the
 * browser asking for the page.
 */
const RECHECK_MS = 50;

let signature = '';
let checkedAt = 0;
let generation = 0;

/**
 * Summarises the content tree without reading any of it.
 *
 * Names, sizes and modification times are enough to notice an edit, and cost a
 * `stat` each rather than a parse.
 *
 * @param dir - Directory to walk
 * @param parts - Accumulator
 * @returns A string that changes whenever the tree does
 */
function scan(dir: string, parts: string[]): string[] {
  let entries: fs.Dirent[];

  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return parts;
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (dir === PUBLIC_DIR && PUBLIC_SKIP_DIRS.has(entry.name)) continue;

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      scan(full, parts);
      continue;
    }

    if (dir === PUBLIC_DIR && PUBLIC_SKIP_FILES.has(entry.name)) continue;

    try {
      const stat = fs.statSync(full);
      parts.push(`${full}:${stat.size}:${stat.mtimeMs}`);
    } catch {
      // A file that vanished between listing and stating is a change in
      // itself; leaving it out of the signature records exactly that.
    }
  }

  return parts;
}

/**
 * Every file under the source directories, named with its size and mtime.
 *
 * One walk, shared by the two ways of summarising it: the generation a memo
 * compares against, and the signature a build step records for the next run.
 *
 * @returns One entry per file, in whatever order the directories offered them
 */
function sourceFiles(): string[] {
  return SOURCE_DIRS.flatMap((dir) => scan(dir, []));
}

/**
 * A number that changes whenever anything under the source directories does.
 *
 * Memoised getters store the generation they were built at and rebuild when it
 * moves. In production it never moves, so they build once.
 *
 * One clock for both directories, deliberately. Splitting it — an assets
 * generation for `public/`, a content generation for the rest — would spare
 * the content memos a rebuild when an image lands, at the price of every memo
 * having to name its clock. The rebuild being spared costs on the order of a
 * hundred milliseconds, in development, on the rare occasion a file is added
 * to `public/`; the complexity would be paid on every getter, forever.
 *
 * @returns The current generation
 */
export function contentGeneration(): number {
  if (CACHE_DERIVED_CONTENT) return 0;

  const now = Date.now();
  if (now - checkedAt < RECHECK_MS) return generation;
  checkedAt = now;

  // The manifest the PDF step writes as well as the sources: rerunning that
  // step mid-session has to move the generation, or the embeds keep describing
  // the pages the previous run drew. It is added here rather than to the
  // signature because a signature that contains it would contain the step's
  // own output — which is the one thing its next run must not react to.
  const parts = sourceFiles();
  const manifest = path.join(PUBLIC_DIR, 'pdf-images', 'index.json');

  try {
    const stat = fs.statSync(manifest);
    parts.push(`${manifest}:${stat.size}:${stat.mtimeMs}`);
  } catch {
    // No manifest yet; its arrival will move the generation.
  }

  const next = parts.sort().join('\n');
  if (next !== signature) {
    signature = next;
    generation += 1;
  }

  return generation;
}

/**
 * Everything the derived data is built from, summarised as one string.
 *
 * The same walk {@link contentGeneration} makes, without the generated page
 * manifest, and exposed for the build steps that run in their own process: a
 * step records the signature it built from, and the next run compares — which
 * is how a step that shares no memory with the last one can still tell that
 * its output is current.
 *
 * Only the two source directories are read, and `public/` skips the
 * directories this module skips. That is what keeps the answer a statement
 * about the sources rather than about the artifacts: a build that rewrites
 * `public/search-index.json` or draws pages into `public/pdf-images/` is not a
 * change to what any of them is derived from, and treating it as one would
 * have every step invalidate itself on the run that produced it.
 *
 * @returns A signature that changes whenever a source file does
 */
export function sourceSignature(): string {
  return sourceFiles().sort().join('\n');
}

/**
 * Returns the cached value when it is still good for the current content.
 *
 * Reads as a guard at the top of a memoised getter:
 *
 * @example
 * ```typescript
 * export function getThing(): Thing {
 *   const hit = cached(memo, thingStamp);
 *   if (hit) return hit;
 *
 *   memo = buildThing();
 *   thingStamp.at = contentGeneration();
 *   return memo;
 * }
 * ```
 *
 * @param value - The memoised value, or null when nothing is stored yet
 * @param stamp - Where the getter records the generation it built at
 * @returns The value while it is current, null when it has to be rebuilt
 */
export function cached<T>(value: T | null, stamp?: { at: number }): T | null {
  if (value === null) return null;
  if (CACHE_DERIVED_CONTENT) return value;
  if (!stamp) return null;

  return stamp.at === contentGeneration() ? value : null;
}

/**
 * A place for a getter to record which generation its memo belongs to.
 *
 * @returns A fresh stamp, never yet built
 */
export function stamp(): { at: number } {
  return { at: -1 };
}

/**
 * Returns a keyed cache that is empty again whenever the content has changed.
 *
 * For getters that memoise per document rather than as a whole. Clearing on a
 * change is simpler than stamping every entry, and no more expensive: the
 * pages are rebuilt on the next request either way.
 *
 * @param map - The cache being kept
 * @param s - Where the generation it was filled at is recorded
 * @returns The same map, cleared if it had gone stale
 */
export function currentMap<K, V>(map: Map<K, V>, s: { at: number }): Map<K, V> {
  const now = contentGeneration();

  if (s.at !== now) {
    map.clear();
    s.at = now;
  }

  return map;
}
