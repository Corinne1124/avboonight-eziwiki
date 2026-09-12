#!/usr/bin/env node

/**
 * Runs the wiki's build — or its dev server — in the order the steps actually
 * depend on, and in parallel where they do not.
 *
 * `npm run build` used to be a chain of `&&`: five scripts, then Next. Each
 * link paid for its own Node start-up and its own scan of the same content
 * tree, and none of them overlapped, so a build spent its opening seconds
 * doing in sequence things that had no reason to be sequential. Three of the
 * five only look at the payload, and the two that touch `public/` write to
 * different directories in it, which leaves exactly one real dependency: the
 * payload has to be valid before anything is built from it.
 *
 * A step that finds its own output already current is cheap either way — that
 * is what the build cache is for — but running it alongside the others rather
 * than after them is what keeps its cost off the critical path.
 *
 * Two modes, because the two commands are not the same job:
 *
 *   node scripts/build.cjs build   check, generate, `next build`
 *   node scripts/build.cjs dev     generate, `next dev`
 *
 * Development leaves the checks out. They are checks, not artifacts: what they
 * exist to stop is a bad payload or a dangling link reaching a deploy, and a
 * deploy is what `build` is. Running them before a dev server would only delay
 * the first page, and `npm run check` is the same thing on demand.
 *
 * Plain `.cjs` on purpose. The steps need `tsx`, but this is the script that
 * starts them, and making the launcher depend on the transpiler it launches
 * would be a circle: a broken `tsx` install would surface as a syntax error in
 * the launcher rather than as a message from the step.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TSX = path.join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const NEXT = path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');

/** Directories under `public/` that hold generated data rather than content. */
const GENERATED_DIRS = new Set(['pdfjs', 'pdf-images', 'fonts']);

/** Thrown to stop the build when a step fails; reported in `main`. */
class StepFailed extends Error {
  constructor(name, code, signal) {
    super(
      signal
        ? `Step "${name}" was terminated by ${signal}`
        : `Step "${name}" failed with exit code ${code}`,
    );
    this.name = name;
    this.code = code;
    this.signal = signal;
  }
}

/**
 * A step: a script under `scripts/`, run through tsx.
 *
 * @param {string} name - How the step is named in the output
 * @param {string} file - Its file under `scripts/`
 * @returns {{name: string, command: string, args: string[]}}
 */
function step(name, file) {
  return { name, command: process.execPath, args: [TSX, path.join(__dirname, file)] };
}

/**
 * Reports whether the wiki has a document for the viewer to show.
 *
 * Asked here, before the step runs, because the step answers it by walking
 * `public/` — and the answer decides whether there is a step to run at all.
 * The generated directories are skipped, so the staged data can never be what
 * justifies staging it.
 *
 * @returns True as soon as one PDF is found
 */
function hasPdf() {
  const publicDir = path.join(ROOT, 'public');

  const walk = (dir, isRoot) => {
    let entries;

    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return false;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;

      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (isRoot && GENERATED_DIRS.has(entry.name)) continue;
        if (walk(full, false)) return true;
        continue;
      }

      if (path.extname(entry.name).toLowerCase() === '.pdf') return true;
    }

    return false;
  };

  return walk(publicDir, true);
}

/**
 * The steps that run before Next, in the order they are listed.
 *
 * None of them is waiting on another: each reads the payload and writes
 * somewhere of its own, which is what makes running them together safe rather
 * than merely fast.
 *
 * @returns {Array<{name: string, command: string, args: string[]}>}
 */
function preSteps() {
  const steps = [
    step('build:search', 'build-search-index.ts'),
    step('build:pdf-images', 'build-pdf-images.ts'),
  ];

  if (hasPdf()) steps.push(step('build:pdfjs', 'copy-pdfjs-assets.ts'));

  return steps;
}

/**
 * Runs one step to completion.
 *
 * Output is inherited rather than captured. These steps print what they did in
 * the form a reader of a build log expects, and capturing to reprint would
 * cost a pipe each and reorder the sections.
 *
 * @param {{name: string, command: string, args: string[]}} s - The step
 * @returns {Promise<{name: string, seconds: number}>} The step and how long it took
 */
function runStep(s) {
  return new Promise((resolve, reject) => {
    const started = Date.now();

    const child = spawn(s.command, s.args, { stdio: 'inherit', cwd: ROOT });

    child.on('error', reject);
    child.on('close', (code, signal) => {
      if (code === 0) resolve({ name: s.name, seconds: (Date.now() - started) / 1000 });
      else reject(new StepFailed(s.name, code, signal));
    });
  });
}

/**
 * Runs steps concurrently and reports how long each took.
 *
 * The steps already running are left to finish rather than killed: they write
 * to separate directories, so one of them failing is not a reason for the
 * others' output to be left half written.
 *
 * @param {Array<{name: string, command: string, args: string[]}>} steps - Steps to run
 */
async function runAll(steps) {
  const timings = await Promise.all(steps.map((s) => runStep(s)));

  console.log(
    `\n⚙️  ${timings.map(({ name, seconds }) => `${name} ${seconds.toFixed(1)}s`).join(', ')}\n`,
  );
}

/**
 * Formats a duration for the closing line.
 *
 * @param {number} milliseconds - Elapsed time
 * @returns A duration a reader can compare against the one before it
 */
function format(milliseconds) {
  const seconds = milliseconds / 1000;
  return seconds < 60 ? `${seconds.toFixed(1)}s` : `${(seconds / 60).toFixed(1)} min`;
}

/**
 * Runs `next` in the mode asked for.
 *
 * `next dev` never returns, so the closing summary is only printed for a
 * build; the dev server's own output is the interesting part of a dev run.
 *
 * @param {'build'|'dev'} mode - Which subcommand to run
 * @returns {Promise<void>}
 */
function runNext(mode) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [NEXT, mode], { stdio: 'inherit', cwd: ROOT });

    child.on('error', reject);
    child.on('close', (code, signal) => {
      if (code === 0) resolve();
      else reject(new StepFailed(`next ${mode}`, code, signal));
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args.includes('dev') ? 'dev' : 'build';

  // `--no-next` stops after the generated artifacts, for a caller that wants
  // to measure or rerun them without paying for the whole site behind them.
  const skipNext = args.includes('--no-next');
  const started = Date.now();

  // Everything the build checks, in one process and in parallel with the steps
  // that generate: the payload validation, the compilation, and the report on
  // the link graph share nothing but the payload they all read, and asking
  // them separately cost three `tsx` start-ups and three scans of the content
  // tree to answer three questions about one.
  //
  // Development skips them. They are checks, not artifacts: what they exist to
  // stop is a bad payload or a dangling link reaching a deploy, and a deploy
  // is `build`. `npm run check` is the same thing on demand.
  const checks = mode === 'build' ? [step('check', 'check.ts')] : [];

  await runAll([...checks, ...preSteps()]);
  console.log(`✅ ${mode === 'dev' ? 'Generated' : 'Built'} in ${format(Date.now() - started)}\n`);

  if (!skipNext) await runNext(mode);
}

main().catch((error) => {
  if (error instanceof StepFailed) {
    console.error(`\n❌ ${error.message}\n`);
    process.exit(error.code || 1);
  }

  console.error('\n❌ Build failed:\n');
  console.error(error);
  process.exit(1);
});
