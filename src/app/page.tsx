import fs from 'node:fs'
import path from 'node:path'
import { db } from '@/lib/db'
import KlubLandingPage from '@/components/landing/KlubLandingPage'
import { SitePreloader } from '@/components/site-preloader'
import type { LandingFaq, LandingProduct } from '@/components/landing/types'
import './landing/klub-santa.css'

export const dynamic = 'force-dynamic'

const FALLBACK_CONTACT_EMAIL = 'hello@klubsanta.com'

function mediaFileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(process.cwd(), 'public', relativePath))
}

type PageSearchParams = {
  checkout?: string | string[]
  ref?: string | string[]
  session_id?: string | string[]
}

function first(value: string | string[] | undefined): string | null {
  const v = Array.isArray(value) ? value[0] : value
  return v && v.length > 0 ? v : null
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>
}): Promise<React.JSX.Element> {
  const params = await searchParams
  const rawCheckout = first(params.checkout)
  const checkoutStatus =
    rawCheckout === 'success' ? ('success' as const) : rawCheckout === 'cancelled' ? ('cancelled' as const) : null
  const [productRows, faqRows, contactSetting] = await Promise.all([
    db.product.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
    db.faq.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
    db.setting.findUnique({ where: { key: 'contact_email' } }),
  ])

  const products: LandingProduct[] = productRows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    points: row.points
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0),
    ribbon: row.ribbon,
    badge: row.badge,
    ctaLabel: row.ctaLabel,
    priceCents: row.priceCents,
    currency: row.currency,
    image: row.image,
    featured: row.featured,
  }))

  const faqs: LandingFaq[] = faqRows.map((row) => ({
    id: row.id,
    question: row.question,
    answer: row.answer,
    sortOrder: row.sortOrder,
  }))

  return (
    <div className="ks-page">
      <SitePreloader />
      <div className="page-wrapper">
        <KlubLandingPage
          products={products}
          faqs={faqs}
          contactEmail={contactSetting?.value ?? FALLBACK_CONTACT_EMAIL}
          heroVideoExists={mediaFileExists('media/hero.mp4')}
          previewVideoExists={mediaFileExists('media/preview.mp4')}
          manifestoExists={mediaFileExists('media/manifesto.mp3')}
          checkoutStatus={checkoutStatus}
          checkoutRef={first(params.ref)}
          checkoutSessionId={first(params.session_id)}
        />
      </div>
    </div>
  )
}
