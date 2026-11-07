import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

// The storefront is a single landing experience; products and FAQ render on
// "/" (data-driven), so the sitemap lists the root with weekly refresh.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ]
}
