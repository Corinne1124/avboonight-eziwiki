/**
 * Deployment base path.
 *
 * GitHub Pages project sites are served from a subdirectory; everywhere else
 * the site sits at the root. Next rewrites its own links and assets for this,
 * but code that fetches a file itself — the search index, for one — has to
 * prefix the path, so it is exposed to the client too.
 */
const basePath = process.env.GITHUB_ACTIONS ? '/eziwiki' : '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only use static export in production builds
  ...(process.env.NODE_ENV === 'production' && { output: 'export' }),
  images: {
    unoptimized: true, // Required for static export
  },
  reactStrictMode: true,
  ...(basePath && { basePath, assetPrefix: basePath }),
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  trailingSlash: true, // Ensures proper routing for static hosting

  // Disable source maps in production to prevent viewing original source
  productionBrowserSourceMaps: false,

  // Additional optimization for production
  ...(process.env.NODE_ENV === 'production' && {
    compiler: {
      removeConsole: {
        exclude: ['error', 'warn'], // Remove console.log but keep error/warn
      },
    },
  }),
};

module.exports = nextConfig;
