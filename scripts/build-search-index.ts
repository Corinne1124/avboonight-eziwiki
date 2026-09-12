#!/usr/bin/env tsx

/**
 * Generates the client search index into `public/`.
 *
 * Runs before `next dev` and `next build`. Writing a static JSON file — rather
 * than exposing a route — keeps search working on any static host, with no
 * server to query.
 *
 * The index is a pure function of the content and the site configuration, both
 * of which the source signature summarises, so a run whose inputs have not
 * moved writes nothing. That is what makes the step cheap on the second
 * `npm run dev`: the first one built the index, and this one only confirms it.
 */

import fs from 'fs/promises';
import path from 'path';
import { readStepManifest, stepIsCurrent, stepRecorder } from '../lib/build/manifest';
import { sourceSignature } from '../lib/cache';
import { buildSearchIndex } from '../lib/search/build';
import { SEARCH_INDEX_PATH, SEARCH_INDEX_VERSION } from '../lib/search/types';

/**
 * Revision of what this step writes.
 *
 * `SEARCH_INDEX_VERSION` covers the shape of an entry, which the browser checks
 * for itself. The revision covers everything else — how documents are split,
 * how much body text is kept, which pages are included — none of which changes
 * that version but all of which changes the file. Bump it whenever the index
 * would come out different from the same content.
 */
const REVISION = 1;

const STEP = 'search-index';

/**
 * What an existing index file has to have been built from to still count.
 *
 * The format version is folded in rather than checked separately: it is what an
 * index is keyed by in the browser, so an index of another version is not a
 * thing to keep, whatever the content has done in the meantime.
 */
const REVISION_KEY = REVISION * 1000 + SEARCH_INDEX_VERSION;

async function main() {
  const outputPath = path.join(process.cwd(), 'public', SEARCH_INDEX_PATH);
  const signature = sourceSignature();

  if (stepIsCurrent(readStepManifest(STEP), REVISION_KEY, signature)) {
    console.log('🔍 Search index is current — not rebuilt');
    return;
  }

  console.log('🔍 Building search index...');

  const index = await buildSearchIndex();
  const json = JSON.stringify(index);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, json, 'utf-8');

  const recorder = stepRecorder(STEP, REVISION_KEY, signature);
  recorder.recorded(outputPath);
  recorder.write();

  const pages = new Set(index.docs.map((doc) => doc.path)).size;
  const kb = (Buffer.byteLength(json) / 1024).toFixed(1);

  console.log(`✅ Indexed ${index.docs.length} entries across ${pages} pages (${kb} kB)\n`);
}

main().catch((error) => {
  console.error('❌ Failed to build search index:');
  console.error(error);
  process.exit(1);
});
