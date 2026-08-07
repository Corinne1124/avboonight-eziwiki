import { Pencil } from 'lucide-react';
import { format } from '@/lib/i18n/strings';
import { getSite } from '@/lib/site';
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
}

/**
 * States when a page was last touched, and offers to let the reader fix it.
 *
 * The two belong together. A date is what tells a reader whether to trust a
 * page, and the moment it says the page is stale is exactly the moment the
 * reader needs somewhere to go with that — otherwise the observation has
 * nowhere to land and the page stays stale.
 *
 * Neither half is guaranteed: a page written but not yet committed has no date,
 * and a wiki with no repository configured has nowhere to send an editor. The
 * row is omitted entirely rather than half-drawn.
 *
 * @param props - Component props
 */
export function PageMeta({ lastModified, editUrl }: PageMetaProps) {
  if (!lastModified && !editUrl) return null;

  // Both the wording and the date format come from the same place. Taking one
  // as a prop and reading the other here would let a caller set a language for
  // the sentence that the date inside it disagrees with.
  const { global, strings: t } = getSite();
  const lang = global.lang || DEFAULT_LANG;

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
    </div>
  );
}
