// Single source of truth for canonical site URL + shared SEO strings.
// Set NEXT_PUBLIC_SITE_URL in production (e.g. https://klubsanta.com);
// every generated absolute URL (OG tags, sitemap, robots, JSON-LD) builds on it.

export const SITE_URL: string = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.APP_URL ||
  'https://klubsanta.com'
).replace(/\/+$/, '')

export const SITE_NAME = 'Klub Santa'

export const SITE_TITLE =
  'Klub Santa — Where Believers Belong | A Living Christmas Tradition'

export const SITE_DESCRIPTION =
  'Klub Santa is a seasonal ritual and global community built around belief, warmth, and family tradition. Experience a personalised call from Santa, heirloom letters, and a circle where believers belong.'

export const OG_IMAGE = '/media/og.jpg'
export const OG_IMAGE_ALT =
  'Klub Santa — personalised Christmas rituals: a call from Santa, heirloom letters and keepsake videos'
