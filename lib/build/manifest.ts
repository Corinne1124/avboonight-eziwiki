import fs from 'fs';
import path from 'path';

/**
 * Records what a build step produced, so the next run can tell whether the
 * work still needs doing.
 *
 * The steps that run before `next` — the search index, the staged pdf.js data,
 * the pages drawn from embedded documents — all read a source tree, transform
 * it, and write the result somewhere durable. Rerunning them is pure cost when
 * neither the sources nor the code that read them has moved, and that is the
 * common case: `npm run dev` runs all three on every start, and every CI run
 * that only touched a stylesheet runs them again.
 *
 * A manifest is the step's own note to itself. It sits in a dot-directory at
 * the project root rather than under `public/`, so it is never served and never
 * mistaken for content; and it is keyed by the same content generation the
 * in-process memos use, so a step that shares a process with the site reads the
 * same clock the site does.
 *
 * Server-only: reads and writes the filesystem.
 */

/** Directory holding every step's record, at the project root. */
export const BUILD_CACHE_DIR = path.join(process.cwd(), '.build-cache');

/** What one step records about a previous run. */
export interface StepManifest {
  /**
   * What the sources looked like when the step last ran.
   *
   * The signature {@link sourceSignature} produces, rather than a generation
   * number: a step runs in its own process, and the generation it counts from
   * zero every time is only meaningful within one. Two runs against an
   * unchanged tree produce the same signature and different generations, which
   * is precisely the distinction a step's memory has to survive.
   */
  signature: string;
  /**
   * Revision of the step's own logic, bumped by hand whenever what it writes
   * changes shape or content.
   *
   * Without it, editing the step is invisible to it: the inputs are the same,
   * so it would keep the output the old code produced.
   */
  revision: number;
  /** Files the step wrote, relative to the project root */
  files: string[];
  /**
   * Size each of those files had when it was written, keyed by the same
   * relative path.
   *
   * Cheap to record and enough to notice a file that something else replaced
   * or truncated: the signature covers edits to the sources, but nothing
   * covers an artifact going missing between two runs.
   */
  sizes: Record<string, number>;
}

/**
 * Path of one step's manifest.
 *
 * @param step - Short name of the step, e.g. `search-index`
 * @returns Absolute path to the manifest file
 */
function manifestPath(step: string): string {
  return path.join(BUILD_CACHE_DIR, `${step}.json`);
}

/**
 * Reads what a step recorded last time.
 *
 * A missing, unreadable or malformed manifest is reported as `null`, which
 * every caller treats the same way: do the work again. Failing to remember is
 * never a reason to fail a build.
 *
 * @param step - Short name of the step
 * @returns The record, or null when there is nothing usable to read
 */
export function readStepManifest(step: string): StepManifest | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(manifestPath(step), 'utf-8')) as unknown;

    if (!parsed || typeof parsed !== 'object') return null;

    const { signature, revision, files, sizes } = parsed as Partial<StepManifest>;
    if (typeof signature !== 'string' || typeof revision !== 'number') return null;
    if (!Array.isArray(files)) return null;

    return {
      signature,
      revision,
      files: files.filter((file) => typeof file === 'string'),
      sizes: sizes && typeof sizes === 'object' ? sizes : {},
    };
  } catch {
    return null;
  }
}

/**
 * Writes what a step produced, for the next run to read.
 *
 * @param step - Short name of the step
 * @param record - The record to store
 */
export function writeStepManifest(step: string, record: StepManifest): void {
  try {
    fs.mkdirSync(BUILD_CACHE_DIR, { recursive: true });
    fs.writeFileSync(manifestPath(step), `${JSON.stringify(record, null, 2)}\n`, 'utf-8');
  } catch {
    // A step that cannot record what it did still did it. The next run repeats
    // the work, which is slower and never wrong.
  }
}

/**
 * Removes a step's record.
 *
 * Called when a step finds nothing to produce — no documents left to index,
 * no PDFs left to draw — so that the artifacts it deleted are not remembered
 * as present.
 *
 * @param step - Short name of the step
 */
export function clearStepManifest(step: string): void {
  try {
    fs.rmSync(manifestPath(step), { force: true });
  } catch {
    // Nothing to do: an absent record and an unremovable one read the same.
  }
}

/**
 * A record under construction, with the bookkeeping kept off the call site.
 *
 * @param step - Short name of the step
 * @param revision - Revision of the step's logic
 * @param signature - Source signature the step is running against
 * @returns A recorder whose `write` publishes the manifest
 */
export function stepRecorder(
  step: string,
  revision: number,
  signature: string,
): {
  /** Records a file the step wrote, measuring it as it goes */
  recorded(absolute: string): void;
  /** Records a file the step wrote, whose size is already known */
  recordedSize(absolute: string, size: number): void;
  /** Publishes the manifest */
  write(): void;
} {
  const files: string[] = [];
  const sizes: Record<string, number> = {};

  const record = (absolute: string, size: number) => {
    const relative = path.relative(process.cwd(), absolute).split(path.sep).join('/');
    if (!files.includes(relative)) files.push(relative);
    sizes[relative] = size;
  };

  return {
    recorded(absolute: string) {
      try {
        record(absolute, fs.statSync(absolute).size);
      } catch {
        // A file that could not be measured is left out, so the next run
        // treats the artifact as incomplete and rebuilds it.
      }
    },
    recordedSize(absolute: string, size: number) {
      record(absolute, size);
    },
    write() {
      writeStepManifest(step, { signature, revision, files, sizes });
    },
  };
}

/**
 * Reports whether a step's previous result can be kept.
 *
 * The three questions are asked in the order that answers them most cheaply:
 * has the step's own code changed, have the sources it reads changed, and is
 * what it wrote still there.
 *
 * @param record - What the step recorded, or null when it recorded nothing
 * @param revision - Current revision of the step's logic
 * @param signature - Current source signature
 * @returns True when the artifacts on disk are exactly what a rerun would write
 */
export function stepIsCurrent(
  record: StepManifest | null,
  revision: number,
  signature: string,
): boolean {
  if (!record) return false;
  if (record.revision !== revision) return false;
  if (record.signature !== signature) return false;

  return recordedFilesIntact(record);
}

/**
 * Reports whether everything a step recorded is still on disk and unchanged.
 *
 * A recorded file that has been deleted or resized means the artifact is not
 * what the record says, which is the state a half-finished clean leaves behind.
 *
 * @param record - What the step recorded
 * @returns True when every file it names is present with the size it had
 */
export function recordedFilesIntact(record: StepManifest): boolean {
  return record.files.every((relative) => {
    try {
      return fs.statSync(path.join(process.cwd(), relative)).size === record.sizes?.[relative];
    } catch {
      return false;
    }
  });
}
