import fs from 'node:fs'
import path from 'node:path'
import { db } from '@/lib/db'
import KlubLandingPage from '@/components/landing/KlubLandingPage'
import type { LandingFaq, LandingProduct } from '@/components/landing/types'
import './landing/klub-santa.css'

export const dynamic = 'force-dynamic'

const FALLBACK_CONTACT_EMAIL = 'hello@klubsanta.com'

function mediaFileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(process.cwd(), 'public', relativePath))
}

export default async function HomePage(): Promise<React.JSX.Element> {
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
      <div className="page-wrapper">
        <KlubLandingPage
          products={products}
          faqs={faqs}
          contactEmail={contactSetting?.value ?? FALLBACK_CONTACT_EMAIL}
          heroVideoExists={mediaFileExists('media/hero.mp4')}
          previewVideoExists={mediaFileExists('media/preview.mp4')}
          manifestoExists={mediaFileExists('media/manifesto.mp3')}
        />
      </div>
    </div>
  )
}
