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
 */
export const PUBLIC_SKIP_DIRS = new Set(['fonts']);

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

  const next = SOURCE_DIRS.flatMap((dir) => scan(dir, []))
    .sort()
    .join('\n');
  if (next !== signature) {
    signature = next;
    generation += 1;
  }

  return generation;
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
