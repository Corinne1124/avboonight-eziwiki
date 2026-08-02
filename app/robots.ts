import { MetadataRoute } from 'next';
import { payload } from '@/payload/config';
import { fileUrl } from '@/lib/basePath';

/**
 * Generate robots.txt file
 * Controls how search engines crawl and index the site
 *
 * @returns Robots configuration
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/_next/'],
    },
    sitemap: fileUrl('/sitemap.xml', payload.global.baseUrl),
  };
}
