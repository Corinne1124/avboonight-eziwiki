import { MarkdownContent } from '@/components/markdown/MarkdownContent';
import { PageTransition } from '@/components/markdown/PageTransition';
import { TableOfContents } from '@/components/layout/TableOfContents';
import { Backlinks } from '@/components/layout/Backlinks';
import { getBacklinks } from '@/lib/graph/build';
import { renderDoc } from '@/lib/markdown/render';
import { getDoc, type ContentDoc } from '@/lib/content/registry';
import { docPathToUrl, urlToDocPath } from '@/lib/navigation/url';
import { getSite } from '@/lib/site';
import { asset, fileUrl, pageUrl } from '@/lib/basePath';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface PageProps {
  params: {
    slug: string[];
  };
}

/**
 * Resolves a route's slug segments to a document in the content registry.
 *
 * Under the `path` strategy a slug has one segment per directory level; under
 * `hash` it is a single opaque segment. Joining first and resolving through the
 * URL map handles both without the route needing to know which is in effect.
 *
 * @param slug - Route segments captured by the catch-all route
 * @returns The content path and its canonical URL segment, or null
 */
function resolveSlug(slug: string[]): { path: string; url: string } | null {
  const { urlMap } = getSite();
  const url = slug.join('/');
  const path = urlToDocPath(urlMap, url);

  return path ? { path, url } : null;
}

/**
 * Generates per-page metadata from the document's frontmatter.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { global, hiddenPaths } = getSite();
  const resolved = resolveSlug(params.slug);
  const doc = resolved ? getDoc(resolved.path) : undefined;

  if (!resolved || !doc) {
    return { title: global.title, description: global.description };
  }

  const title = doc.title;
  const description = doc.description || global.description;
  const rawOgImage = doc.frontmatter.ogImage as string | undefined;
  const ogImage = rawOgImage ? fileUrl(rawOgImage, global.baseUrl) : undefined;
  const canonicalUrl = pageUrl(resolved.url, global.baseUrl);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    icons: {
      icon: asset((doc.frontmatter.favicon as string) || global.favicon || '/favicon.ico'),
    },
    // Hidden pages stay reachable by direct link but should not be indexed.
    robots: hiddenPaths.has(resolved.path) ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      images: ogImage ? [ogImage] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

/**
 * Enumerates every document for static generation.
 *
 * The list comes from the content registry, so a Markdown file is built whether
 * or not navigation references it. That is what lets hidden and unlisted pages
 * work without a parallel registration step.
 */
export async function generateStaticParams() {
  const { urlMap, docPaths } = getSite();

  return docPaths.flatMap((path) => {
    const url = docPathToUrl(urlMap, path);
    return url ? [{ slug: url.split('/') }] : [];
  });
}

/**
 * Emits Article structured data for a document.
 */
function ArticleSchema({ doc, url }: { doc: ContentDoc; url: string }) {
  const { global } = getSite();
  const baseUrl = global.baseUrl || 'https://example.com';
  const published = doc.frontmatter.date ?? null;
  const modified = doc.frontmatter.updated ?? published;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: doc.title,
          description: doc.description || global.description,
          url: `${baseUrl}/${url}`,
          // Dates are omitted when absent rather than stamped with the build
          // time: a fabricated date misleads both readers and crawlers.
          ...(published ? { datePublished: published } : {}),
          ...(modified ? { dateModified: modified } : {}),
          author: {
            '@type': 'Organization',
            name: global.title,
          },
        }),
      }}
    />
  );
}

/**
 * Renders a content page: the document body, plus its table of contents on
 * screens wide enough to carry a second column.
 */
export default async function ContentPage({ params }: PageProps) {
  const resolved = resolveSlug(params.slug);

  if (!resolved) notFound();

  const doc = getDoc(resolved.path);
  const rendered = await renderDoc(resolved.path);

  if (!doc || !rendered) notFound();

  return (
    <PageTransition>
      <div className="flex gap-8">
        <article className="prose prose-slate min-w-0 max-w-none flex-1 dark:prose-invert">
          <ArticleSchema doc={doc} url={resolved.url} />
          <MarkdownContent html={rendered.html} />
          <Backlinks links={getBacklinks(resolved.path)} />
        </article>

        <aside className="hidden w-56 flex-shrink-0 xl:block">
          <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
            <TableOfContents headings={rendered.headings} />
          </div>
        </aside>
      </div>
    </PageTransition>
  );
}
