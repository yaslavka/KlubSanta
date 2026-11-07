'use client'

import { RitualModalProvider } from './ritual-context'
import SiteHeader from './SiteHeader'
import Hero from './Hero'
import ManifestoSection from './ManifestoSection'
import OffersSection from './OffersSection'
import JourneySection from './JourneySection'
import TestimonialsSection from './TestimonialsSection'
import StatsBar from './StatsBar'
import CountdownBanner from './CountdownBanner'
import PillarsSection from './PillarsSection'
import MagicPreview from './MagicPreview'
import NewsletterSection from './NewsletterSection'
import SiteFooter from './SiteFooter'
import RitualModal from './RitualModal'
import type { LandingFaq, LandingProduct } from './types'

type KlubLandingPageProps = {
  products: LandingProduct[]
  faqs: LandingFaq[]
  contactEmail: string
  heroVideoExists: boolean
  previewVideoExists: boolean
  manifestoExists: boolean
}

export default function KlubLandingPage({
  products,
  faqs,
  contactEmail,
  heroVideoExists,
  previewVideoExists,
  manifestoExists,
}: KlubLandingPageProps): React.JSX.Element {
  return (
    <RitualModalProvider>
      <SiteHeader />
      <Hero heroVideoExists={heroVideoExists} />
      <ManifestoSection />
      <OffersSection products={products} />
      <JourneySection />
      <TestimonialsSection />
      <StatsBar />
      <CountdownBanner />
      <PillarsSection faqs={faqs} />
      <MagicPreview previewVideoExists={previewVideoExists} manifestoExists={manifestoExists} />
      <NewsletterSection />
      <SiteFooter contactEmail={contactEmail} />
      <RitualModal products={products} />
    </RitualModalProvider>
  )
}
