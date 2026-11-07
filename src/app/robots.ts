import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

// Served at /robots.txt. Keep functional surfaces (admin, API, checkout)
// out of search indexes; the marketing landing page stays fully crawlable.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/', '/api/', '/checkout/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
