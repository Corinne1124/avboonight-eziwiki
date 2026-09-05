import { NavigationItem } from '../payload/types';
import { getContentRegistry, titleize, type ContentDoc, type DirMeta } from '../content/registry';
import { extractAllPaths } from './builder';
import { cached, contentGeneration, stamp } from '../cache';

/**
 * Filesystem-derived navigation.
 *
 * The curated tree in `payload/config.ts` stays authoritative for naming and
 * ordering, but it no longer has to be exhaustive: any document under
 * `content/` that the curated tree does not mention is discovered here and
 * appended to the section matching its directory. Adding a Markdown file is
 * therefore enough to publish it.
 *
 * This module reads the content registry and must only run on the server.
 */

/** Sort weight applied to directories without an explicit `order`. */
const DEFAULT_DIR_ORDER = Number.MAX_SAFE_INTEGER;

/**
 * Returns the parent directory of a content directory path.
 *
 * @param dir - Directory path relative to `content/`
 * @returns The parent directory, or '' for a top-level directory
 */
function parentDir(dir: string): string {
  const index = dir.lastIndexOf('/');
  return index === -1 ? '' : dir.slice(0, index);
}

/**
 * Deep-clones a navigation tree so merging never mutates the payload config.
 *
 * The payload is a module-level constant shared across every rendered page;
 * appending discovered documents to it in place would compound the tree on
 * each render during a dev session.
 */
function cloneTree(items: NavigationItem[]): NavigationItem[] {
  return items.map((item) => ({
    ...item,
    children: item.children ? cloneTree(item.children) : undefined,
  }));
}

/**
 * Maps content directories to the curated section that already represents them.
 *
 * A curated section does not declare which directory it covers, so ownership is
 * inferred from its descendants: a section whose documents all live under
 * `getting-started/` is taken to own that directory. Sections spanning several
 * directories are left unmapped, since appending to them would be a guess.
 *
 * @param items - Curated navigation tree
 * @returns Directory path to the owning navigation node
 */
function indexSectionsByDir(items: NavigationItem[]): Map<string, NavigationItem> {
  const sections = new Map<string, NavigationItem>();

  function visit(node: NavigationItem): Set<string> {
    const dirs = new Set<string>();

    if (node.path) {
      const index = node.path.lastIndexOf('/');
      dirs.add(index === -1 ? '' : node.path.slice(0, index));
    }

    for (const child of node.children ?? []) {
      for (const dir of visit(child)) dirs.add(dir);
    }

    // Only claim ownership when the section is unambiguous.
    if (node.children && dirs.size === 1) {
      const [dir] = Array.from(dirs);
      if (dir && !sections.has(dir)) {
        sections.set(dir, node);
      }
    }

    return dirs;
  }

  for (const item of items) visit(item);
  return sections;
}

/**
 * The sort weight a document contributes to its position at the top level.
 *
 * For a document inside a folder this is the folder's `_meta.json` order, since
 * the document's own order only ranks it among its siblings. For a root-level
 * document there is no folder, so its own `order` serves — which is what lets a
 * single sequence of numbers interleave root pages and sections, rather than
 * root pages always landing after every folder.
 */
function sectionOrder(doc: ContentDoc, dirOrder: (dir: string) => number): number {
  return doc.dir === '' ? doc.order : dirOrder(doc.dir);
}

/**
 * Orders discovered documents so that appended entries land predictably.
 *
 * Documents are grouped by the section they belong to and those sections
 * ordered first, so that a section is created at the right position the moment
 * its first document is appended. Within a section, documents follow their own
 * frontmatter order.
 */
function compareOrphans(a: ContentDoc, b: ContentDoc, dirOrder: (dir: string) => number): number {
  const aSection = sectionOrder(a, dirOrder);
  const bSection = sectionOrder(b, dirOrder);
  if (aSection !== bSection) return aSection - bSection;

  if (a.dir !== b.dir) return a.dir.localeCompare(b.dir);
  if (a.order !== b.order) return a.order - b.order;
  return a.title.localeCompare(b.title);
}

/**
 * Builds a navigation node for a discovered document.
 */
function docToNavItem(doc: ContentDoc): NavigationItem {
  const item: NavigationItem = {
    name: doc.title,
    path: doc.path,
  };

  if (typeof doc.frontmatter.icon === 'string') item.icon = doc.frontmatter.icon;
  if (typeof doc.frontmatter.color === 'string') item.color = doc.frontmatter.color;

  return item;
}

/**
 * Builds a navigation section node for a content directory.
 */
function dirToNavItem(dir: string, meta: DirMeta): NavigationItem {
  const name = meta.name ?? titleize(dir.slice(dir.lastIndexOf('/') + 1));
  const item: NavigationItem = { name, children: [] };

  if (meta.icon) item.icon = meta.icon;
  if (meta.color) item.color = meta.color;
  if (meta.hidden) item.hidden = true;

  return item;
}

/**
 * Merges curated navigation with documents discovered under `content/`.
 *
 * Curated entries are preserved exactly as written. Every document not already
 * referenced — and not marked `hidden` in its frontmatter — is appended to the
 * section covering its directory, creating that section (and any missing
 * ancestors) when necessary.
 *
 * A directory whose own page is a nested `index.md` stops being a bare section
 * and becomes that page: the node carries the folder's path, opens on a click,
 * and still holds the folder's other pages as its children. A page with
 * sub-pages therefore needs no configuration — write `content/guides/index.md`
 * next to the pages that belong under it.
 *
 * @param curated - Navigation from the payload config; may be empty
 * @returns The merged navigation tree
 *
 * @example
 * ```typescript
 * // content/guides/advanced.md exists but is absent from the payload
 * const nav = mergeDiscoveredDocs(payload.navigation ?? []);
 * // The 'Guides' section now includes an 'Advanced' entry.
 * ```
 */
export function mergeDiscoveredDocs(curated: NavigationItem[]): NavigationItem[] {
  const { docs, dirMeta } = getContentRegistry();
  const root = cloneTree(curated);

  const referenced = new Set(extractAllPaths(root));
  const sections = indexSectionsByDir(root);

  // Directory → its folder page, for directories that have one. A page that
  // the curated tree lists, or that hides itself in frontmatter, cannot head
  // a folder here.
  const dirIndex = new Map<string, ContentDoc>();
  for (const doc of docs) {
    if (!doc.indexDir || doc.hidden || referenced.has(doc.path)) continue;
    dirIndex.set(doc.indexDir, doc);
  }

  const orphans = docs.filter((doc) => !referenced.has(doc.path) && !doc.hidden);

  // Which directories will actually appear as navigation nodes. Every orphan
  // contributes its own directory and each ancestor; a folder page is only
  // attached to a node when that node exists, so a folder holding nothing but
  // its own page stays an ordinary leaf page instead of vanishing.
  const nodeDirs = new Set<string>();
  for (const doc of orphans) {
    if (doc.indexDir) continue; // folder pages ride on the nodes their siblings build
    for (let dir = doc.dir; dir; dir = parentDir(dir)) nodeDirs.add(dir);
  }
  const hosted = new Set<string>();
  for (const doc of orphans) {
    if (doc.indexDir && nodeDirs.has(doc.indexDir)) hosted.add(doc.indexDir);
  }

  const leaves = orphans.filter((doc) => !(doc.indexDir && hosted.has(doc.indexDir)));

  // A directory's sort weight. Folders without metadata sort after every root
  // page, as before; a folder page that does not set `_meta.json` order keeps
  // the `order` its own page declares, so moving `x.md` into `x/index.md`
  // does not silently reposition the page among its siblings.
  const dirOrder = (dir: string) =>
    dirMeta.get(dir)?.order ?? dirIndex.get(dir)?.order ?? DEFAULT_DIR_ORDER;

  /**
   * Turns a directory node into the folder page that heads it, when one exists.
   *
   * Only nodes the auto-merge built itself gain the page's path — a curated
   * section is preserved exactly as written, and listing `path` there is how a
   * curated tree says it wants the page. The folder's `_meta.json` keeps the
   * last word on name, colour and icon, so styling a folder stays where it was.
   */
  function attachFolderPage(node: NavigationItem, dir: string): void {
    if (node.path) return;
    const index = dirIndex.get(dir);
    if (!index) return;

    node.path = index.path;
    // `_meta.json` keeps the last word on how the folder is presented; the
    // page's own title only fills in when the folder names none.
    const meta = dirMeta.get(dir);
    if (!meta?.name) node.name = index.title;
    if (!meta?.icon && !node.icon && typeof index.frontmatter.icon === 'string') {
      node.icon = index.frontmatter.icon;
    }
    if (!meta?.color && !node.color && typeof index.frontmatter.color === 'string') {
      node.color = index.frontmatter.color;
    }
  }

  /**
   * Returns the children array that documents in `dir` should be appended to,
   * creating the section chain if it does not exist yet.
   */
  function childrenFor(dir: string): NavigationItem[] {
    if (!dir) return root;

    const existing = sections.get(dir);
    if (existing) {
      existing.children ??= [];
      // A curated section that owns this directory gains the folder page as
      // its path; its label, colour and ordering stay exactly as written.
      const index = dirIndex.get(dir);
      if (index && !existing.path) existing.path = index.path;
      return existing.children;
    }

    const node = dirToNavItem(dir, dirMeta.get(dir) ?? {});
    attachFolderPage(node, dir);
    childrenFor(parentDir(dir)).push(node);
    sections.set(dir, node);

    return node.children!;
  }

  for (const doc of [...leaves].sort((a, b) => compareOrphans(a, b, dirOrder))) {
    const item = docToNavItem(doc);
    // A `_meta.json` that hides a folder hides the pages it holds even when
    // the folder is not a section of its own (a directory containing only an
    // `index.md` page).
    const physicalDir = doc.indexDir ?? doc.dir;
    if (dirMeta.get(physicalDir)?.hidden) item.hidden = true;
    childrenFor(doc.dir).push(item);
  }

  return root;
}

/**
 * Flags curated entries whose document hides itself in frontmatter.
 *
 * Discovery already leaves such documents out, but a curated entry is kept
 * exactly as written — so a page marked `hidden: true` that the payload also
 * lists stayed in the sidebar and in the reading sequence, while search, the
 * sitemap and the graph all honoured the frontmatter. Marking the entry here
 * lets every consumer of the tree agree with them.
 */
function markHiddenDocs(items: NavigationItem[], hidden: Set<string>): void {
  for (const item of items) {
    if (item.path && hidden.has(item.path)) item.hidden = true;
    if (item.children) markHiddenDocs(item.children, hidden);
  }
}

let memo: NavigationItem[] | null = null;
const memoStamp = stamp();

/**
 * Returns the site navigation, memoised per process.
 *
 * When `autoNavigation` is disabled in the payload, the curated tree is
 * returned untouched; otherwise discovered documents are merged in.
 *
 * @param curated - Navigation from the payload config
 * @param autoNavigation - Whether to append discovered documents (default true)
 * @returns The navigation tree to render
 */
export function getNavigation(
  curated: NavigationItem[] | undefined,
  autoNavigation = true,
): NavigationItem[] {
  const hit = cached(memo, memoStamp);
  if (hit) return hit;

  const base = curated ?? [];
  const tree = autoNavigation ? mergeDiscoveredDocs(base) : cloneTree(base);

  // Both branches return a clone, so this never marks the payload itself.
  const hiddenDocs = new Set(
    getContentRegistry()
      .docs.filter((doc) => doc.hidden)
      .map((doc) => doc.path),
  );
  markHiddenDocs(tree, hiddenDocs);

  memo = tree;
  memoStamp.at = contentGeneration();

  return memo;
}
