#!/usr/bin/env tsx

/**
 * Everything the build checks about its sources, in one process.
 *
 * Three questions, each cheap on its own and expensive to ask separately: the
 * payload has to validate, the pages have to compile, and every link has to
 * point at something. Answering them from three commands meant three `tsx`
 * start-ups — and a `tsx` start-up is an esbuild service and a module graph
 * before the first line of the script runs, which on this project is closer to
 * three seconds than to none — plus three scans of the same content tree.
 *
 * They are also independent, so they run together and the build waits for the
 * slowest rather than for the sum.
 *
 * The payload is the exception, and is checked before the others start: it is
 * the file the other two interpret, and a report on the link graph of a site
 * whose configuration does not parse is noise on top of the answer.
 *
 *     npm run check            # report; only the payload is fatal
 *     npm run check -- --strict # a dangling link fails too, as CI wants
 */

import { checkPayload } from './validate-payload';
import { reportLinks, type LinkReport } from './check-links';
import { isEntryPoint } from '../lib/build/entryPoint';

/**
 * Runs the checks, printing each as it finishes.
 *
 * @returns What was found
 */
export async function runChecks(): Promise<{ payload: boolean; links: LinkReport }> {
  const payload = checkPayload();

  // The link report is skipped when the payload does not parse: it reads that
  // file too, and a list of dangling links computed from a broken
  // configuration is noise on top of the answer.
  if (!payload) return { payload, links: { ok: false, broken: 0, collisions: 0 } };

  return { payload, links: reportLinks() };
}

// Wrapped rather than run at the top level: this file is part of the project
// Next compiles, and the compiler is told the target is ES2017, where a
// top-level `await` is a syntax error.
async function main(): Promise<void> {
  const strict = process.argv.includes('--strict');
  const { payload, links } = await runChecks();

  if (!payload) process.exit(1);

  // Without `--strict` a dangling link is reported and not fatal: a page
  // written before the page it references is how a wiki grows, and failing a
  // build over one would be the wrong trade. CI passes `--strict`.
  process.exit(links.ok || !strict ? 0 : 1);
}

if (isEntryPoint(import.meta.url)) {
  main().catch((error) => {
    console.error('❌ Check failed:\n');
    console.error(error);
    process.exit(1);
  });
}
