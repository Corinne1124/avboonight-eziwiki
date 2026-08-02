import type { Metadata } from 'next';
import './globals.css';
import 'katex/dist/katex.min.css';
import { PageLayout } from '@/components/layout/PageLayout';
import { TabInitializer } from '@/components/layout/TabInitializer';
import { UrlMapProvider } from '@/components/providers/UrlMapProvider';
import { SearchDialog } from '@/components/search/SearchDialog';
import { payload } from '@/payload/config';
import { validatePayload } from '@/lib/payload/validator';
import { getSite } from '@/lib/site';
import { asset } from '@/lib/basePath';

// Validate payload at build time
const validation = validatePayload(payload);
if (!validation.valid) {
  console.error('❌ Payload validation failed:');
  validation.errors?.forEach((err) => console.error(`  - ${err}`));
  throw new Error('Invalid payload configuration. Please fix the errors above.');
}

// Generate metadata from payload
export const metadata: Metadata = {
  metadataBase: payload.global.baseUrl ? new URL(payload.global.baseUrl) : undefined,
  title: payload.global.title,
  description: payload.global.description,
  icons: {
    icon: asset(payload.global.favicon || '/favicon.ico'),
  },
  openGraph: payload.global.seo?.openGraph
    ? {
        title: payload.global.seo.openGraph.title || payload.global.title,
        description: payload.global.seo.openGraph.description || payload.global.description,
        images: payload.global.seo.openGraph.images,
      }
    : undefined,
  twitter: payload.global.seo?.twitter
    ? {
        card: payload.global.seo.twitter.card || 'summary_large_image',
        site: payload.global.seo.twitter.site,
        creator: payload.global.seo.twitter.creator,
        title: payload.global.seo.twitter.title || payload.global.title,
        description: payload.global.seo.twitter.description || payload.global.description,
        images: payload.global.seo.twitter.images,
      }
    : undefined,
};

/**
 * Web fonts, declared here rather than in `globals.css`.
 *
 * A stylesheet has no way to read the deployment base path, so a hardcoded
 * `url('/fonts/…')` keeps pointing at the domain root and 404s once the site is
 * served from a subdirectory — leaving every visitor on fallback fonts. Emitting
 * the declarations from here puts them through `asset()` like every other file
 * in `public/`.
 *
 * `preload` marks the weights the first paint needs; the rest load on demand.
 */
const FONT_FACES = [
  { family: 'SUITE', weight: 400, file: '/fonts/SUITE/SUITE-Regular.woff2' },
  { family: 'SUITE', weight: 600, file: '/fonts/SUITE/SUITE-SemiBold.woff2' },
  { family: 'SUITE', weight: 700, file: '/fonts/SUITE/SUITE-Bold.woff2' },
  {
    family: 'Pretendard',
    weight: 400,
    file: '/fonts/Pretandard/Pretendard-Regular.woff2',
    preload: true,
  },
  {
    family: 'Pretendard',
    weight: 600,
    file: '/fonts/Pretandard/Pretendard-SemiBold.woff2',
    preload: true,
  },
  { family: 'Pretendard', weight: 700, file: '/fonts/Pretandard/Pretendard-Bold.woff2' },
];

const fontFaceCss = FONT_FACES.map(
  ({ family, weight, file }) =>
    `@font-face{font-family:'${family}';font-weight:${weight};` +
    `src:url('${asset(file)}') format('woff2');font-display:swap}`,
).join('');

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const site = getSite();
  const baseUrl = site.global.baseUrl || 'https://example.com';

  return (
    <html lang="en">
      <head>
        {FONT_FACES.filter((font) => font.preload).map((font) => (
          <link
            key={font.file}
            rel="preload"
            href={asset(font.file)}
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
        ))}
        <style dangerouslySetInnerHTML={{ __html: fontFaceCss }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: site.global.title,
              description: site.global.description,
              url: baseUrl,
            }),
          }}
        />
      </head>
      <body>
        <UrlMapProvider value={site.urlMap}>
          <TabInitializer navigation={site.navigation} />
          <PageLayout navigation={site.navigation}>{children}</PageLayout>
          <SearchDialog />
        </UrlMapProvider>
      </body>
    </html>
  );
}
