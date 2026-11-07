'use client'

import { useEffect, useState } from 'react'
import type { FormEvent, MouseEvent } from 'react'
import { BadgeCheck, Loader2 } from 'lucide-react'
import { formatMoney, LANGUAGES } from '@/lib/site'
import { useRitualModal } from './ritual-context'
import type { LandingProduct } from './types'

type ModalStatus = 'idle' | 'submitting' | 'success'

type CheckoutPhase = 'idle' | 'redirecting' | 'manual' | 'error'

type BookingApiResponse = {
  booking?: {
    id: string
    reference: string
    status: string
    planName: string
  }
  message?: string
  error?: string
}

type CheckoutApiResponse = {
  url?: string
  code?: string
  error?: string
}

const AGE_RANGES = ['0-3', '4-7', '8-11', '12+', 'Adult'] as const

type RitualModalProps = {
  products: LandingProduct[]
}

export default function RitualModal({ products }: RitualModalProps): React.JSX.Element {
  const { isOpen, preselectedSlug, closeRitual } = useRitualModal()

  const featuredSlug = products.find((product) => product.featured)?.slug ?? products[0]?.slug ?? null

  const [userPickedSlug, setUserPickedSlug] = useState<string | null>(null)
  const [recipientName, setRecipientName] = useState('')
  const [pronunciation, setPronunciation] = useState('')
  const [ageRange, setAgeRange] = useState('')
  const [language, setLanguage] = useState<string>(LANGUAGES[0])
  const [parentEmail, setParentEmail] = useState('')
  const [memoryNote, setMemoryNote] = useState('')
  const [consentGiven, setConsentGiven] = useState(false)
  const [status, setStatus] = useState<ModalStatus>('idle')
  const [checkoutPhase, setCheckoutPhase] = useState<CheckoutPhase>('idle')
  const [checkoutNote, setCheckoutNote] = useState<string | null>(null)
  const [reference, setReference] = useState('')
  const [feedback, setFeedback] = useState('')

  // Opening via openRitual(slug) preselects that product; without a slug the
  // featured (or first) product is highlighted.
  const selectedSlug = userPickedSlug ?? preselectedSlug ?? featuredSlug

  const resetForm = () => {
    setUserPickedSlug(null)
    setRecipientName('')
    setPronunciation('')
    setAgeRange('')
    setLanguage(LANGUAGES[0])
    setParentEmail('')
    setMemoryNote('')
    setConsentGiven(false)
    setStatus('idle')
    setCheckoutPhase('idle')
    setCheckoutNote(null)
    setReference('')
    setFeedback('')
  }

  const handleClose = () => {
    resetForm()
    closeRitual()
  }

  // Close on Escape while the dialog is visible.
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, handleClose])

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) handleClose()
  }

  const startCheckout = async (bookingId: string, bookingReference: string, email: string) => {
    setCheckoutPhase('redirecting')
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      })
      const data = (await res.json().catch(() => null)) as CheckoutApiResponse | null
      if (res.ok && data?.url) {
        window.location.href = data.url
        return
      }
      if (res.status === 503) {
        setCheckoutPhase('manual')
        setCheckoutNote(
          `Your reservation ${bookingReference} is saved. Online payment is being activated — our North Pole post will email ${email} to complete your ritual.`,
        )
        return
      }
      setCheckoutPhase('error')
      setCheckoutNote(
        data?.error ??
          `Your reservation ${bookingReference} is saved. Our keepers of the ledger will contact you to complete your ritual.`,
      )
    } catch {
      setCheckoutPhase('error')
      setCheckoutNote(
        `Your reservation ${bookingReference} is saved, but the checkout could not be opened. Our North Pole post will email ${email} to complete your ritual.`,
      )
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (status === 'submitting') return

    const product = products.find((item) => item.slug === selectedSlug) ?? products[0]
    if (!product) {
      setFeedback('Choose a ritual to continue.')
      return
    }
    if (!consentGiven) {
      setFeedback('Please confirm you are an adult and accept the Privacy & Child Safety terms.')
      return
    }

    setStatus('submitting')
    setFeedback('')
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productSlug: product.slug,
          recipientName: recipientName.trim(),
          pronunciation: pronunciation.trim(),
          ageRange,
          language,
          parentEmail: parentEmail.trim(),
          memoryNote: memoryNote.trim(),
          consentGiven: true,
        }),
      })
      const data = (await res.json().catch(() => null)) as BookingApiResponse | null
      if (res.status === 201 && data?.booking) {
        setReference(data.booking.reference)
        setStatus('success')
        await startCheckout(data.booking.id, data.booking.reference, parentEmail.trim())
        return
      }
      setFeedback(
        data?.error ?? 'We could not inscribe the reservation. Please try again in a moment.',
      )
      setStatus('idle')
    } catch {
      setFeedback('The North Pole post line is busy. Please try again in a moment.')
      setStatus('idle')
    }
  }

  return (
    <div
      className={`ks-modal-backdrop${isOpen ? ' is-open' : ''}`}
      id="membership-offer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ks-modal-title"
      onClick={handleBackdropClick}
    >
      <div className="ks-modal-dialog">
        <button type="button" className="ks-modal-close" id="ks-modal-close" aria-label="Close ritual reservation" onClick={handleClose}>
          &times;
        </button>
        <span className="ks-modal-kicker">The Believer Ledger</span>
        <h3 id="ks-modal-title">Prepare Your Family&rsquo;s Ritual</h3>
        <p>
          Select your gathering below and share the first details for our North Pole ledger. We will
          guide you through personalising their story.
        </p>

        {status === 'success' ? (
          <div className="ks-modal-success" role="status">
            <BadgeCheck className="ks-success-icon" aria-hidden="true" />
            <h4>Inscribed in the Believer Ledger</h4>
            <p>
              Your reservation reference is <strong>{reference}</strong>. A confirmation letter is on
              its way to your inbox.
            </p>
            {checkoutPhase === 'redirecting' ? <p>Opening secure checkout&hellip;</p> : null}
            {checkoutPhase !== 'redirecting' && checkoutNote ? (
              <>
                <p>{checkoutNote}</p>
                <button type="button" className="ks-modal-success-close" onClick={handleClose}>
                  Close
                </button>
              </>
            ) : null}
          </div>
        ) : (
          <>
            <div className="ks-modal-plans" id="ks-modal-plans">
              {products.map((product) => {
                const kicker = product.ribbon ?? product.tagline
                const sub = product.ribbon ? product.tagline : product.badge ?? ''
                return (
                  <button
                    type="button"
                    key={product.id}
                    className={`ks-modal-plan${product.slug === selectedSlug ? ' is-selected' : ''}`}
                    data-plan={product.slug}
                    onClick={() => setUserPickedSlug(product.slug)}
                  >
                    <small>{kicker}</small>
                    <strong>{product.name}</strong>
                    <span>
                      {sub ? `${sub} · ` : ''}
                      {formatMoney(product.priceCents, product.currency)}
                    </span>
                  </button>
                )
              })}
            </div>

            <form className="ks-modal-form" id="ks-ritual-form" onSubmit={handleSubmit}>
              <input
                type="text"
                id="ks-child-name"
                placeholder="Believer's First Name (Child, Parent, or Elder)"
                required
                value={recipientName}
                onChange={(event) => setRecipientName(event.target.value)}
              />
              <input
                type="text"
                id="ks-pronunciation"
                placeholder="How to pronounce it (optional)"
                value={pronunciation}
                onChange={(event) => setPronunciation(event.target.value)}
              />
              <select
                id="ks-age-range"
                aria-label="Believer age range"
                value={ageRange}
                onChange={(event) => setAgeRange(event.target.value)}
              >
                <option value="">Age Range (optional)</option>
                {AGE_RANGES.map((range) => (
                  <option key={range} value={range}>
                    Ages {range}
                  </option>
                ))}
              </select>
              <select
                id="ks-language"
                aria-label="Preferred Language"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
              >
                {LANGUAGES.map((option) => (
                  <option key={option} value={option}>
                    Language: {option}
                  </option>
                ))}
              </select>
              <input
                type="email"
                id="ks-parent-email"
                placeholder="Your Email Address for Confirmation"
                required
                value={parentEmail}
                onChange={(event) => setParentEmail(event.target.value)}
              />
              <input
                type="text"
                id="ks-memory-note"
                placeholder="One proud moment or kindness from this year"
                value={memoryNote}
                onChange={(event) => setMemoryNote(event.target.value)}
              />
              <label className="ks-modal-consent" htmlFor="ks-consent">
                <input
                  type="checkbox"
                  id="ks-consent"
                  name="consent"
                  required
                  checked={consentGiven}
                  onChange={(event) => setConsentGiven(event.target.checked)}
                />
                <span>
                  I am an adult creating this ritual and I agree to the Privacy &amp; Child Safety
                  terms
                </span>
              </label>
              <button type="submit" className="ks-modal-submit" disabled={status === 'submitting'}>
                {status === 'submitting' ? (
                  <>
                    <Loader2 className="ks-icon ks-modal-spinner" aria-hidden="true" />
                    <span>Sealing your letter&hellip;</span>
                  </>
                ) : (
                  <>Inscribe in the Ledger &amp; Continue &rarr;</>
                )}
              </button>
            </form>
            <p
              id="ks-modal-feedback"
              role="alert"
              style={{ margin: '12px 0 0', fontWeight: 700, color: 'var(--ks-primary-red)', textAlign: 'center' }}
            >
              {feedback}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
