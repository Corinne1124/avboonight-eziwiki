import { GraphView } from '@/components/graph/GraphView';
import { PageTransition } from '@/components/markdown/PageTransition';
import { getLinkGraph } from '@/lib/graph/build';
import { format } from '@/lib/i18n/strings';
import { formatNodes } from '@/lib/i18n/nodes';
import { getStrings } from '@/lib/site';
import { getSite } from '@/lib/site';
import type { Metadata } from 'next';

/**
 * The link graph view.
 *
 * A static route, so it takes precedence over the catch-all content route and
 * cannot be shadowed by a page named `graph`.
 */

export function generateMetadata(): Metadata {
  const { global, strings } = getSite();

  return {
    title: `${strings.graph} · ${global.title}`,
    description: strings.graphDescription,
    // The graph is navigation, not content; there is nothing here for a search
    // engine to index that the pages themselves do not already provide.
    robots: { index: false, follow: true },
  };
}

export default function GraphPage() {
  const { nodes, edges, broken } = getLinkGraph();
  const linked = nodes.filter((node) => node.degree > 0).length;
  const t = getStrings();

  return (
    <PageTransition>
      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">{t.graph}</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {format(t.graphSummary, {
            pages: nodes.length,
            links: edges.length,
            connected: linked,
          })}{' '}
          {t.graphHint}
        </p>
      </div>

      <GraphView nodes={nodes} edges={edges} />

      {broken.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
            {format(t.unresolvedLinks, { count: broken.length })}
          </h2>
          <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
            {broken.map((link, index) => (
              <li key={`${link.from}-${link.target}-${index}`}>
                {formatNodes(t.unresolvedLink, {
                  target: <code className="text-red-600 dark:text-red-400">[[{link.target}]]</code>,
                  page: <span className="text-gray-900 dark:text-gray-200">{link.from}</span>,
                })}
                {link.reason === 'ambiguous' && link.candidates && (
                  <>
                    {' '}
                    — {format(t.unresolvedAmbiguous, { candidates: link.candidates.join(', ') })}
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </PageTransition>
  );
}
