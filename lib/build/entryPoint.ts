import path from 'path';
import { pathToFileURL } from 'url';

/**
 * Whether a script was run directly rather than imported.
 *
 * The scripts under `scripts/` are both commands and, for the ones the build
 * launcher folds together, modules that other scripts import. A script that
 * did its work at import time could not be the second thing: reading it would
 * run it, and under `next build` — which compiles every `.ts` file in the
 * project — it would run inside the build as well.
 *
 * `import.meta.url === pathToFileURL(process.argv[1]).href` is the check
 * everybody writes, and it fails quietly in two cases this handles: Windows
 * paths, where `pathToFileURL` is what makes the two comparable at all, and an
 * argument vector with nothing in the first slot, which is what a `node -e`
 * or a test runner leaves behind.
 *
 * @param moduleUrl - The caller's `import.meta.url`
 * @returns True when this module is the process's entry point
 *
 * @example
 * ```typescript
 * if (isEntryPoint(import.meta.url)) process.exit(run() ? 0 : 1);
 * ```
 */
export function isEntryPoint(moduleUrl: string): boolean {
  const entry = process.argv[1];
  if (!entry) return false;

  try {
    return moduleUrl === pathToFileURL(path.resolve(entry)).href;
  } catch {
    // A path that cannot be turned into a URL is not the module asking.
    return false;
  }
}
