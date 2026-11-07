'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, Loader2, Mail } from 'lucide-react'

type FeedbackTone = 'success' | 'error'

type Feedback = {
  tone: FeedbackTone
  text: string
}

const GENERIC_ERROR =
  'The North Pole Post could not be reached. Please try again in a moment.'

export default function NewsletterSection(): React.JSX.Element {
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return

    const trimmed = email.trim()
    if (!trimmed) {
      setFeedback({ tone: 'error', text: 'Please share a valid email address so our letter can reach your hearth.' })
      return
    }

    setPending(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })
      const data = (await res.json().catch(() => null)) as { message?: string; error?: string } | null
      if (res.ok && data?.message) {
        setFeedback({ tone: 'success', text: data.message })
        setEmail('')
      } else {
        setFeedback({ tone: 'error', text: data?.error ?? GENERIC_ERROR })
      }
    } catch {
      setFeedback({ tone: 'error', text: GENERIC_ERROR })
    } finally {
      setPending(false)
    }
  }

  return (
    <section
      id="north-pole-newsletter"
      className="home-section8 home-newsletter"
      aria-labelledby="newsletter-heading"
    >
      <div className="newsletter-shell">
        <div className="newsletter-copy">
          <div className="newsletter-eyebrow">
            <span>✦</span>
            The North Pole Dispatch
          </div>
          <h2 id="newsletter-heading">
            Receive Quiet Letters From <em>Klub Santa</em>
          </h2>
          <p className="newsletter-lede">
            Join our circle of believers to receive seasonal reflections, early access to Christmas
            Eve call windows, and our 24-day December Advent prompts.
          </p>
          <div className="newsletter-benefits">
            <span>✦ Priority Christmas Eve Windows</span>
            <span>✦ Candlelight Advent Prompts</span>
            <span>✦ Gifting Circle Updates</span>
          </div>

          <form id="newsletter-form" className="newsletter-form" noValidate onSubmit={handleSubmit}>
            <label htmlFor="newsletter-email" className="newsletter-sr-only">
              Email address
            </label>
            <span className="newsletter-input-icon" aria-hidden="true">
              <Mail className="ks-icon" />
            </span>
            <input
              type="email"
              id="newsletter-email"
              name="email"
              placeholder="Enter your family email address..."
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <button type="submit" className="newsletter-submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="ks-icon ks-modal-spinner" aria-hidden="true" />
                  <span>Entering&hellip;</span>
                </>
              ) : (
                <>
                  <span>Enter the Circle</span>
                  <ArrowRight className="ks-icon" aria-hidden="true" />
                </>
              )}
            </button>
          </form>
          <p
            id="newsletter-feedback"
            className={`newsletter-feedback${feedback ? ` is-${feedback.tone}` : ''}`}
            role="status"
            aria-live="polite"
          >
            {feedback?.text ?? ''}
          </p>
          <p className="newsletter-note">Sent only when the season calls. Never noisy, never shared.</p>
        </div>

        <div className="newsletter-visual" aria-hidden="true">
          <div className="newsletter-message newsletter-message-top">
            <span>✦</span> Inscribed in the Believer Ledger
          </div>
          <div className="newsletter-envelope">
            <div className="newsletter-envelope-flap"></div>
            <div className="newsletter-envelope-paper">
              <b>From Klub Santa</b>
              <small>Where Believers Belong</small>
            </div>
            <div className="newsletter-stamp">
              KS
              <i>✦</i>
            </div>
            <div className="newsletter-seal">✦</div>
          </div>
          <div className="newsletter-message newsletter-message-bottom">
            <span>✦</span> Sealed in Crimson &amp; Gold
          </div>
        </div>
      </div>
    </section>
  )
}
