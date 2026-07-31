#!/usr/bin/env tsx

/**
 * Reports links that point at no page.
 *
 * Runs as part of the build and reports rather than fails: a dangling link in
 * one page is not a reason to block a deploy of the other twenty, and content
 * is often written before the page it references exists. Pass `--strict` in CI
 * to make it an error.
 */

import { getLinkGraph } from '../lib/graph/build';

const strict = process.argv.includes('--strict');
const { broken, nodes, edges } = getLinkGraph();

if (broken.length === 0) {
  console.log(`🔗 Links OK — ${edges.length} links across ${nodes.length} pages\n`);
  process.exit(0);
}

console.log(`\n🔗 ${broken.length} unresolved link${broken.length === 1 ? '' : 's'}:\n`);

for (const link of broken) {
  console.log(`  content/${link.from}.md`);

  if (link.reason === 'ambiguous') {
    console.log(`    [[${link.target}]] is ambiguous — matches ${link.candidates?.join(', ')}`);
    console.log('    Use the full path to disambiguate.');
  } else {
    console.log(`    [[${link.target}]] matches no page`);
  }
}

console.log();

if (strict) {
  console.error('❌ Failing because --strict was passed.\n');
  process.exit(1);
}
