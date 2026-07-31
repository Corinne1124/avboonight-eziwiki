import { Payload } from '@/lib/payload/types';

/**
 * Site configuration.
 *
 * Navigation is intentionally absent: every page under `content/` is discovered
 * automatically, grouped by folder, and ordered by frontmatter. See
 * `content/configuration/navigation.md` for how to override that.
 */
export const payload: Payload = {
  global: {
    title: 'eziwiki',
    description:
      'A beautiful, minimal wiki and documentation site generator inspired by Notion and Obsidian',
    favicon: '/favicon.svg',
    baseUrl: 'https://eziwiki.dev',
    /**
     * URL form for content pages.
     *
     * 'path' mirrors the content tree (`/getting-started/quick-start`) and is
     * what search engines and readers can make sense of.
     * 'hash' emits opaque digests (`/a3f2e9d1-...`), concealing the structure
     * at the cost of SEO and shareable links.
     */
    urlStrategy: 'path',
    /**
     * Publish pages found under `content/` without listing them anywhere.
     *
     * This site relies on it entirely: there is no `navigation` array below.
     * Section names, order, and colours come from each folder's `_meta.json`,
     * and page order from frontmatter. Add a `navigation` array here to take
     * manual control of naming and ordering.
     */
    autoNavigation: true,
    seo: {
      openGraph: {
        title: 'eziwiki - Beautiful Documentation Made Easy',
        description:
          'A beautiful, minimal wiki and documentation site generator inspired by Notion and Obsidian',
        images: [
          {
            url: '/og-image.svg',
            width: 1200,
            height: 630,
            alt: 'eziwiki',
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'eziwiki - Beautiful Documentation Made Easy',
        description:
          'A beautiful, minimal wiki and documentation site generator inspired by Notion and Obsidian',
        images: ['/og-image.svg'],
      },
    },
  },
  theme: {
    primary: '#2563eb',
    secondary: '#7c3aed',
    background: '#ffffff',
    text: '#1f2937',
    sidebarBg: '#f9fafb',
    codeBg: '#f3f4f6',
  },
};

export default payload;
