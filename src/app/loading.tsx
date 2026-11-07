import { BrandSplash } from '@/components/brand-splash'

/**
 * Root route-level preloader: shown while async server components render
 * (the landing awaits catalog / FAQ / settings from the database).
 * Mirrors the admin panel splash — same crest, same brand moment.
 */
export default function Loading() {
  return <BrandSplash />
}
