/**
 * Deployment base path.
 *
 * GitHub Pages project sites are served from a subdirectory; everywhere else
 * the site sits at the root. Next rewrites its own links and assets for this,
 * but code that fetches a file itself — the search index, for one — has to
 * prefix the path, so it is exposed to the client too.
 *
 * Read from the environment rather than inferred from CI: `GITHUB_ACTIONS` is
 * set for every job in a workflow, so inferring from it applied the prefix
 * during tests and on forks as well as during the deploy it was meant for. The
 * deploy workflow sets this explicitly.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Directories the build id is derived from, and the ones under `public/` that
 * hold generated files rather than sources.
 *
 * The same split `lib/cache.ts` makes, for the same reason: a build that
 * rewrites `public/search-index.json` or draws pages into `public/pdf-images/`
 * has not changed any input, and a build id that changed with its own output
 * would be different on every run no matter what.
 */
const SOURCE_DIRS = ['content', 'public'];
const SKIP_DIRS = new Set(['fonts', 'pdfjs', 'pdf-images']);

/**
 * A digest of everything the site is built from.
 *
 * Names, sizes and modification times, which is enough to notice an edit and
 * costs a `stat` each rather than a read.
 *
 * @param dir - Directory to walk, relative to the project root
 * @param parts - Accumulator
 * @returns One entry per file
 */
function describeTree(dir, parts = []) {
  let entries;

  try {
    entries = fs.readdirSync(path.join(__dirname, dir), { withFileTypes: true });
  } catch {
    return parts;
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (dir === 'public' && SKIP_DIRS.has(entry.name)) continue;

    const relative = `${dir}/${entry.name}`;

    if (entry.isDirectory()) {
      describeTree(relative, parts);
      continue;
    }

    try {
      const stat = fs.statSync(path.join(__dirname, relative));
      parts.push(`${relative}:${stat.size}:${stat.mtimeMs}`);
    } catch {
      // A file that vanished between listing and stating is a change in
      // itself; leaving it out records exactly that.
    }
  }

  return parts;
}

/**
 * The build id, derived from the content instead of drawn at random.
 *
 * Next generates a random one per build, and it is written into every page and
 * into the name of the directory holding the client chunks. That makes two
 * builds of the same content differ in all 133 files and in where their assets
 * live — which is a new URL for a browser and a CDN to fetch for a deploy that
 * changed nothing, and it is what stops an incremental host from recognising
 * the output it already has.
 *
 * Derived, the id is stable while the site is, and different the moment
 * anything it is built from is — including the base path, which changes every
 * URL the site emits.
 *
 * @returns A short, URL-safe build id
 */
function contentBuildId() {
  const fingerprint = `${basePath}\n${SOURCE_DIRS.flatMap((dir) => describeTree(dir)).sort().join('\n')}`;

  return crypto.createHash('sha256').update(fingerprint).digest('hex').slice(0, 16);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only use static export in production builds
  ...(process.env.NODE_ENV === 'production' && { output: 'export' }),
  images: {
    unoptimized: true, // Required for static export
  },
  reactStrictMode: true,
  ...(basePath && { basePath, assetPrefix: basePath }),
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  trailingSlash: true, // Ensures proper routing for static hosting

  // Disable source maps in production to prevent viewing original source
  productionBrowserSourceMaps: false,

  generateBuildId: contentBuildId,

  /**
   * Linting is not part of a build here.
   *
   * `next build` runs ESLint over the project by default, and this project's
   * ESLint configuration is type-aware — `parserOptions.project` hands the
   * linter the whole program to answer rules that need types. That is the
   * single most expensive thing in the build that is not producing anything:
   * on this site it took about fourteen seconds, to re-derive answers the
   * type checker had already given.
   *
   * `npm run lint` is the same configuration, run where a lint failure is the
   * thing being asked about, and CI runs it as its own step. Deleting it from
   * the build removes the wait, not the check.
   */
  eslint: { ignoreDuringBuilds: true },

  /**
   * Type checking is not part of a build here either, for the same reason.
   *
   * `npm run build` type checks the project as one of its first steps, in
   * parallel with the generators, and it fails there — before Next is
   * started — if anything does not compile. Running the compiler again inside
   * the build would repeat that answer for another twenty seconds.
   *
   * `npm run type-check` is the same command on demand.
   */
  typescript: { ignoreBuildErrors: true },

  // Additional optimization for production
  ...(process.env.NODE_ENV === 'production' && {
    compiler: {
      removeConsole: {
        exclude: ['error', 'warn'], // Remove console.log but keep error/warn
      },
    },
  }),
};

module.exports = nextConfig;
