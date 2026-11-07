'use client'

import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type Testimonial = {
  quote: string
  author: string
  detail: string
  badge: string
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'When the phone rang on Christmas Eve and Santa mentioned how brave our daughter Léo had been starting her new school in Lyon, she held my hand so tightly. We all had tears in our eyes.',
    author: 'Camille & Thomas M.',
    detail: 'Lyon, France · 2nd Year Member',
    badge: 'Believer Family',
  },
  {
    quote:
      'We gifted a call in Cantonese to my 82-year-old grandmother who lives alone. Hearing someone speak to her with such warmth and remembrance on December 24th gave her the brightest smile of the year.',
    author: 'Mei-Ling C.',
    detail: 'Hong Kong & Vancouver · Gifting Token',
    badge: 'Gifting Circle',
  },
  {
    quote:
      'Our twins were starting to doubt because of kids at school. Then the wax-sealed letter arrived on the mantle and Santa called that evening knowing their secret treehouse password. Belief restored.',
    author: 'Hannah & James R.',
    detail: 'Edinburgh, UK · Keepsake Ritual',
    badge: 'Believer Family',
  },
  {
    quote:
      'Being far from our extended family in Taipei, having Santa speak to our little boy in Mandarin felt like wrapping our whole living room in our childhood traditions. This is what Christmas should feel like.',
    author: 'Wei & Claire L.',
    detail: 'Montreal, Canada · Klub Member',
    badge: 'Believer Family',
  },
  {
    quote:
      'Nothing flashy or commercial - just candlelight, hot cocoa, and a voice full of kindness. My children still keep their crimson wax-sealed letters on their bedside tables in July.',
    author: 'Sofia & Marco B.',
    detail: 'Milan, Italy · Complete Ritual',
    badge: 'Believer Family',
  },
]

const TESTIMONIAL_GAP = 20

export default function TestimonialsSection(): React.JSX.Element {
  const reelRef = useRef<HTMLDivElement | null>(null)

  const scrollReel = (direction: 'prev' | 'next') => {
    const reel = reelRef.current
    if (!reel) return
    const firstCard = reel.querySelector<HTMLElement>('.testimonial-card')
    const step = firstCard ? firstCard.offsetWidth + TESTIMONIAL_GAP : 390
    reel.scrollBy({ left: direction === 'next' ? step : -step, behavior: 'smooth' })
  }

  return (
    <section id="testimonials" className="home-section3">
      <div className="container">
        <div className="testimonial-heading">
          <div className="testimonial-heading-copy">
            <p className="testimonial-kicker">
              <span></span>Voices From the Circle
            </p>
            <h2>Stories From Families Who Made Klub Santa Their Tradition</h2>
            <p>
              Across continents and generations, these are the quiet December evenings parents and
              grandparents remember most.
            </p>
          </div>
          <div className="testimonial-controls" aria-label="Testimonial navigation">
            <button
              type="button"
              className="testimonial-arrow"
              data-testimonial-dir="prev"
              aria-label="Previous stories"
              onClick={() => scrollReel('prev')}
            >
              <ChevronLeft className="ks-icon" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="testimonial-arrow"
              data-testimonial-dir="next"
              aria-label="Next stories"
              onClick={() => scrollReel('next')}
            >
              <ChevronRight className="ks-icon" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="testimonial-scroll" id="testimonial-scroll" ref={reelRef}>
          {TESTIMONIALS.map((testimonial) => (
            <article className="testimonial-card" key={testimonial.author}>
              <div>
                <div className="testimonial-stars" aria-label="5 North Stars">
                  ✦ ✦ ✦ ✦ ✦
                </div>
                <blockquote className="testimonial-quote">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
              </div>
              <div className="testimonial-footer">
                <p className="testimonial-author">
                  {testimonial.author}
                  <span>{testimonial.detail}</span>
                </p>
                <span className="testimonial-badge">{testimonial.badge}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
