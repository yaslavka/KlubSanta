'use client'

import { ArrowRight } from 'lucide-react'
import { formatMoney } from '@/lib/site'
import { useRitualModal } from './ritual-context'
import type { LandingProduct } from './types'

type OffersSectionProps = {
  products: LandingProduct[]
}

export default function OffersSection({ products }: OffersSectionProps): React.JSX.Element {
  const { openRitual } = useRitualModal()

  const openProduct = (slug: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    openRitual(slug)
  }

  return (
    <section id="santa-offers" className="home-section2 santa-offers">
      <div className="container">
        <div className="santa-offers-heading">
          <p className="santa-offers-kicker">
            <span></span>Ways to Belong
          </p>
          <h2>
            Five Ways to Welcome <em>Klub Santa</em> Into Your Home
          </h2>
          <p>
            Each offering is crafted as an heirloom moment rather than a transaction. Choose the
            ritual that fits your family table this season.
          </p>
        </div>

        <div className="santa-offers-grid">
          {products.map((product) => (
            <article
              key={product.id}
              className={`santa-offer-card${product.featured ? ' is-featured' : ''}`}
            >
              {product.ribbon ? <div className="santa-offer-ribbon">{product.ribbon}</div> : null}
              <a
                href="#membership-offer"
                className="santa-offer-media"
                onClick={openProduct(product.slug)}
              >
                {product.image ? (
                  <img src={product.image} alt={`${product.name} - ${product.badge ?? product.tagline}`} loading="lazy" />
                ) : null}
                {product.badge ? <span className="santa-offer-tag">{product.badge}</span> : null}
              </a>
              <div className="santa-offer-body">
                <p className="santa-offer-type">{product.tagline}</p>
                <h3>{product.name}</h3>
                <p className="santa-offer-copy">{product.description}</p>
                <ul className="santa-offer-points">
                  {product.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
                <div className="santa-offer-bottom">
                  <div className="santa-offer-price">
                    <span>Seasonal Offering</span>
                    <strong>{formatMoney(product.priceCents, product.currency)}</strong>
                  </div>
                  <button
                    type="button"
                    className="santa-offer-cta"
                    onClick={() => openRitual(product.slug)}
                  >
                    <span>{product.ctaLabel}</span>
                    <ArrowRight className="ks-icon" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
