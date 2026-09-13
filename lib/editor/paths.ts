/**
 * Page paths, as the editor has to reason about them.
 *
 * The editor writes files into a repository rather than into a directory it can
 * list, so a path typed by a reader has to be checked here — before it becomes
 * a commit — and turned into the file that would hold it. A path that names a
 * folder (`ailan/`) becomes that folder's `index.md`, which is the same
 * convention the navigation uses to publish a page that can hold sub-pages.
 *
 * Pure and client-safe: no filesystem, no registry.
 */

/** A page the editor can act on. */
export interface PageTarget {
  /** Canonical content path, e.g. 'guides/setup' */
  path: string;
  /** True when the page is a folder's own page, held in `<path>/index.md` */
  folderPage: boolean;
}

/** Why a typed path cannot be used. */
export type PathProblem = 'empty' | 'reserved' | 'draft' | 'invalid';

/** Either a usable target or the reason it is not one. */
export type PathCheck = { ok: true; target: PageTarget } | { ok: false; problem: PathProblem };

/**
 * First URL segments the app keeps for its own views.
 *
 * Mirrors `RESERVED_SEGMENTS` in `lib/navigation/routes.ts`. That module reads
 * the content registry, which cannot cross into the browser, and a page under
 * one of these segments would be built and then shadowed by the graph or tag
 * route — so it is refused here instead. `lib/editor/paths.test.ts` asserts the
 * two lists stay identical.
 */
export const RESERVED_SEGMENTS = ['graph', 'tags'];

/** Characters no sane filename carries, and which break URLs besides. */
const FORBIDDEN = /[\\:*?"<>|\u0000-\u001f]/;

/**
 * Turns a title into a path a file could be created at.
 *
 * The conventions are the wiki's own: lower case, hyphens for spaces — the same
 * transform `suggestPath()` applies to a wanted page's link target. Letters
 * outside ASCII survive, because a wiki written in Chinese or Korean names its
 * files in those letters too.
 *
 * @param target - A title or a path, as typed
 * @returns A content-relative path, possibly empty
 *
 * @example
 * ```typescript
 * suggestPagePath('Quick Start'); // 'quick-start'
 * suggestPagePath('guides/Setup Now'); // 'guides/setup-now'
 * ```
 */
export function suggestPagePath(target: string): string {
  return target
    .split('/')
    .map((segment) =>
      segment
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/g, ''),
    )
    .filter(Boolean)
    .join('/');
}

/**
 * Checks a path typed into the editor and turns it into a page target.
 *
 * A trailing slash asks for a folder page (`ailan/` → `ailan/index.md`), and so
 * does an explicit `.../index`. Leading and trailing slashes and a `.md` suffix
 * are tolerated, since all three are how people write a path.
 *
 * @param input - Path as typed
 * @returns The target, or the reason it was refused
 *
 * @example
 * ```typescript
 * checkPagePath('guides/setup'); // { ok: true, target: { path: 'guides/setup', folderPage: false } }
 * checkPagePath('ailan/');       // { ok: true, target: { path: 'ailan', folderPage: true } }
 * checkPagePath('/graph/');      // { ok: false, problem: 'reserved' }
 * ```
 */
export function checkPagePath(input: string): PathCheck {
  const trimmed = input.trim().replace(/^\/+|\/+$/g, '');

  // A folder page is asked for by a trailing slash (`ailan/`) or by naming the
  // file that holds it (`ailan/index`). Alone, `index` is just a page called
  // index — there is no folder for it to stand for.
  const explicitIndex = /(^|\/)index(\.md)?$/i.test(trimmed) && trimmed.includes('/');
  const wantsFolder = /\/$/.test(input.trim()) || explicitIndex;

  const withoutIndex = explicitIndex ? trimmed.replace(/\/index(\.md)?$/i, '') : trimmed;
  const withoutExt = withoutIndex.replace(/\.md$/i, '');
  const normalized = withoutExt
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join('/');

  if (!normalized) return { ok: false, problem: 'empty' };

  const segments = normalized.split('/');

  for (const segment of segments) {
    if (segment === '.' || segment === '..' || FORBIDDEN.test(segment)) {
      return { ok: false, problem: 'invalid' };
    }
    // Underscored names are the wiki's drafts: the build skips them, so a page
    // created under one would never appear.
    if (segment.startsWith('_') || segment.startsWith('.')) {
      return { ok: false, problem: 'draft' };
    }
  }

  if (RESERVED_SEGMENTS.includes(segments[0].toLowerCase())) {
    return { ok: false, problem: 'reserved' };
  }

  return { ok: true, target: { path: segments.join('/'), folderPage: wantsFolder } };
}

/**
 * The repository file a page lives in.
 *
 * @param target - Page target
 * @returns Path from the repository root, e.g. 'content/ailan/index.md'
 */
export function filePathFor(target: PageTarget): string {
  return target.folderPage ? `content/${target.path}/index.md` : `content/${target.path}.md`;
}

/**
 * The files a page could live in, most likely first.
 *
 * A reader arriving with a URL knows the page's canonical path but not which of
 * the two conventions the file follows — nothing in the URL says whether
 * `ailan` is `ailan.md` or `ailan/index.md`. Reading the plain file first and
 * the folder page second costs one extra request only for folder pages, and
 * avoids sending a map of every document to the browser for the sake of this
 * one lookup.
 *
 * @param pagePath - Canonical content path
 * @returns Candidate repository paths, in the order they should be tried
 */
export function candidateFilesFor(pagePath: string): string[] {
  const trimmed = pagePath.replace(/^\/+|\/+$/g, '');
  if (!trimmed) return [];

  return [`content/${trimmed}.md`, `content/${trimmed}/index.md`];
}

/**
 * The canonical path a repository file publishes.
 *
 * The inverse of {@link filePathFor}, used when a commit's path has to be
 * checked against the page the editor believes it is editing.
 *
 * @param file - Path from the repository root, e.g. 'content/ailan/index.md'
 * @returns The content path, or null when the file is not under `content/`
 */
export function pagePathForFile(file: string): string | null {
  const match = /^content\/(.+)\.md$/i.exec(file.replace(/^\/+/, ''));
  if (!match) return null;

  return match[1].replace(/\/index$/i, '');
}
