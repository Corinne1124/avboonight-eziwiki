import { Pencil } from 'lucide-react';
import { format } from '@/lib/i18n/strings';
import { getSite } from '@/lib/site';
import { payload } from '@/payload/config';
import { parseRepo } from '@/lib/editor/github';
import { EditPageButton } from '@/components/editor/EditPageButton';
import type { LastModified } from '@/lib/content/lastModified';

/**
 * Formats a calendar date in the wiki's own language.
 *
 * The date is parsed as UTC midnight so that only the `YYYY-MM-DD` the author's
 * clock showed is ever formatted — see `calendarDate()`. A locale the platform
 * does not carry falls back to the plain date rather than throwing, which is
 * still readable and still correct.
 *
 * @param date - Calendar date as `YYYY-MM-DD`
 * @param lang - BCP 47 tag from the site config
 * @returns The date written out, e.g. `6 August 2026`
 */
function formatDate(date: string, lang: string): string {
  try {
    return new Intl.DateTimeFormat(lang, { dateStyle: 'long', timeZone: 'UTC' }).format(
      new Date(`${date}T00:00:00Z`),
    );
  } catch {
    return date;
  }
}

/** Language announced when the payload names none. */
const DEFAULT_LANG = 'en';

interface PageMetaProps {
  /** When the page last changed, from `getLastModified()` */
  lastModified: LastModified | null;
  /** Where the page can be edited, from `getEditUrl()` */
  editUrl: string | null;
  /** Canonical path of this page, for the in-browser editor */
  path: string;
}

/**
 * States when a page was last touched, and offers to let the reader fix it.
 *
 * The two belong together. A date is what tells a reader whether to trust a
 * page, and the moment it says the page is stale is exactly the moment the
 * reader needs somewhere to go with that — otherwise the observation has
 * nowhere to land and the page stays stale.
 *
 * Two ways to fix it are offered when the site allows both: editing in place,
 * for a reader with a token, and the repository itself, which is where a change
 * too large for a textarea belongs and the only place a reader without one can
 * go. A wiki with no repository configured omits the row entirely rather than
 * drawing it half.
 *
 * @param props - Component props
 */
export function PageMeta({ lastModified, editUrl, path }: PageMetaProps) {
  // Both the wording and the date format come from the same place. Taking one
  // as a prop and reading the other here would let a caller set a language for
  // the sentence that the date inside it disagrees with.
  const { global, strings: t } = getSite();
  const lang = global.lang || DEFAULT_LANG;

  // The in-browser editor is offered only where the site can commit at all,
  // which is the same condition the layout resolves for the client. Knowing it
  // here is what keeps an otherwise empty row from being drawn on a wiki that
  // has no dates, no repository and no editor.
  const canEditHere = payload.editor?.enabled === true && parseRepo(global.repoUrl) !== null;

  if (!lastModified && !editUrl && !canEditHere) return null;

  // Split around the date rather than concatenating a label onto it: the
  // sentence is the translation's to arrange, and only the date itself belongs
  // inside the `<time>` carrying the machine-readable timestamp.
  const [before, after = ''] = format(t.lastUpdated, { date: '\u0000' }).split('\u0000');

  return (
    <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
      {lastModified ? (
        <span>
          {before}
          <time dateTime={lastModified.iso}>{formatDate(lastModified.date, lang)}</time>
          {after}
        </span>
      ) : (
        // Holds the row so a lone edit link stays where it is when both are
        // present, rather than sliding to the left edge.
        <span />
      )}

      <span className="flex items-center gap-3">
        <EditPageButton path={path} />

        {editUrl ? (
          <a
            href={editUrl}
            rel="noopener noreferrer nofollow"
            target="_blank"
            // The colour is stated rather than inherited: `prose` styles every
            // anchor as a link in the accent colour, which would put this row in
            // competition with the reading-order cards below it. It is metadata,
            // and reads as metadata until it is pointed at.
            className="inline-flex items-center gap-1.5 py-0.5 text-gray-500 no-underline transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            {t.editThisPage}
          </a>
        ) : null}
      </span>
    </div>
  );
}
