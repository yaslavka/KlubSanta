'use client'

import { ArrowRight } from 'lucide-react'
import { useRitualModal } from './ritual-context'
import type { LandingFaq } from './types'

type PillarsSectionProps = {
  faqs: LandingFaq[]
}

const PILLARS = [
  {
    tag: '01 · The Crest',
    image: '/media/logo.svg',
    alt: 'Klub Santa Official Crest',
    title: 'The Believer Ledger',
    copy: "Every member is inscribed in our North Pole ledger so Santa remembers last year's wishes, pets, and milestones as your child grows.",
    cta: 'Inscribe a Name',
    slug: 'circle-membership',
  },
  {
    tag: '02 · The Post',
    image: '/media/offer-letter.jpg',
    alt: 'Wax-sealed heirloom letter',
    title: 'Wax-Sealed Post',
    copy: 'Tangible letters sealed in crimson wax and gold foil that children can hold in their hands and treasure in the family memory box.',
    cta: 'Send North Pole Mail',
    slug: 'wax-sealed-letter',
  },
  {
    tag: '03 · The Advent',
    image: '/media/pillar-advent.jpg',
    alt: '24-Day December Advent Ritual',
    title: '24-Day Advent Ritual',
    copy: 'From December 1st to Christmas Eve, open a daily candlelit story, reflection, or audio whisper from the North Pole with your family.',
    cta: 'Unlock Advent',
    slug: 'circle-membership',
  },
  {
    tag: '04 · The Hearth',
    image: '/media/pillar-keepsake.jpg',
    alt: 'Living Room Keepsake Portrait',
    title: 'Living Room Keepsake',
    copy: 'Wake up on Christmas morning to gentle proof that Santa paused by your tree, ready to share around the breakfast table.',
    cta: 'Create Keepsake',
    slug: 'complete-keepsake-ritual',
  },
  {
    tag: '05 · The Gift',
    image: '/media/pillar-gift.jpg',
    alt: 'Gifting Tokens for Elders and Orphans',
    title: 'Gifting Token Circle',
    copy: 'Extend the circle of warmth to grandparents, friends, orphans, and isolated elders so every believer hears their name called.',
    cta: 'Share a Token',
    slug: 'gifting-token-circle',
  },
] as const

export default function PillarsSection({ faqs }: PillarsSectionProps): React.JSX.Element {
  const { openRitual } = useRitualModal()

  return (
    <section id="santa-fun-things" className="home-section6">
      <div className="container">
        <div className="santa-fun-heading">
          <p className="santa-fun-kicker">
            <span></span>More Than a Call
          </p>
          <h2>Five Pillars of the Klub Santa Community</h2>
          <p>
            The phone call is only the doorway. Inside Klub Santa, families gather around five
            enduring traditions designed to keep belief alive at every age.
          </p>
        </div>

        <div className="santa-fun-grid">
          {PILLARS.map((pillar) => (
            <article className="santa-fun-card" key={pillar.tag}>
              <span className="santa-fun-tag">{pillar.tag}</span>
              <div className="santa-fun-art">
                <img src={pillar.image} alt={pillar.alt} loading="lazy" />
              </div>
              <h3>{pillar.title}</h3>
              <p>{pillar.copy}</p>
              <a
                href="#membership-offer"
                className="santa-fun-cta"
                onClick={(event) => {
                  event.preventDefault()
                  openRitual(pillar.slug)
                }}
              >
                <span>{pillar.cta}</span>
                <ArrowRight className="ks-icon" aria-hidden="true" />
              </a>
            </article>
          ))}
        </div>

        <div className="ks-faq-drawer" id="sacred-questions">
          <div className="ks-faq-drawer-head">
            <h3>Questions Families Ask Before Entering the Circle</h3>
            <p>Thoughtful answers for parents, grandparents, and keepers of the tradition.</p>
          </div>
          <div className="ks-faq-grid">
            {faqs.map((faq, index) => (
              <details className="ks-faq-item" key={faq.id} open={index === 0 || undefined}>
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
