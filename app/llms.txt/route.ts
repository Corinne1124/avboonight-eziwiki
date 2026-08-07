import { renderLlmsTxt } from '@/lib/content/llms';

/**
 * Serves `/llms.txt`.
 *
 * A route handler rather than a file in `public/`, because the content is
 * derived from the wiki and has to be rebuilt whenever a page is added,
 * renamed or described differently — which a file checked in by hand would
 * not be.
 *
 * `dynamic` is forced static so the export writes it out as a plain file; the
 * site has no server to answer for it.
 */
export const dynamic = 'force-static';

export function GET(): Response {
  return new Response(renderLlmsTxt(), {
    headers: {
      // `charset` matters: the wiki may be in a language whose page titles are
      // not Latin, and this file is mostly titles.
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
