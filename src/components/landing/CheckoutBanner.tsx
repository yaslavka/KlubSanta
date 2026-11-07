'use client'

import { useEffect, useRef, useState } from 'react'
import { BadgeCheck, CircleAlert, Loader2 } from 'lucide-react'

export type CheckoutBannerStatus = 'success' | 'cancelled'

type Props = {
  status: CheckoutBannerStatus
  reference: string | null
  sessionId: string | null
}

/**
 * Banner shown after returning from a hosted checkout.
 *
 * Sandbox gateway: the order is already marked paid server-side, so this is a
 * pure confirmation.
 *
 * Stripe: the URL carries session_id — we verify the session against Stripe
 * (POST /api/checkout/confirm) once. This drives the fulfillment pipeline even
 * when the signed webhook is unreachable (local test mode). In production the
 * webhook normally wins the race and the confirm call is a no-op (idempotent).
 */
export default function CheckoutBanner({ status, reference, sessionId }: Props) {
  const [verifying, setVerifying] = useState(Boolean(status === 'success' && sessionId))
  const [verified, setVerified] = useState(!sessionId)
  const startedRef = useRef(false)

  useEffect(() => {
    if (!sessionId || status !== 'success' || startedRef.current) return
    startedRef.current = true
    let cancelled = false

    async function confirm() {
      try {
        const res = await fetch('/api/checkout/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })
        if (!cancelled) setVerified(res.ok)
      } catch {
        // Webhook remains the source of truth — never block the UI on this.
        if (!cancelled) setVerified(true)
      } finally {
        if (!cancelled) setVerifying(false)
      }
    }

    void confirm()
    return () => {
      cancelled = true
    }
  }, [sessionId, status])

  if (status === 'cancelled') {
    return (
      <div
        role="status"
        className="mx-auto mb-2 w-full max-w-3xl rounded-lg border border-[#D0A56A]/50 bg-[#D0A56A]/10 px-4 py-3 text-sm leading-relaxed text-[#3A0008]"
      >
        <span className="font-semibold text-[#7D0A16]">Checkout closed</span>
        {reference ? (
          <>
            {' '}
            — reservation <strong>{reference}</strong> remains safely inscribed in the Believer
            Ledger. You can complete the payment whenever you are ready.
          </>
        ) : (
          ' — your reservation remains safely inscribed in the Believer Ledger.'
        )}
      </div>
    )
  }

  return (
    <div
      role="status"
      className="mx-auto mb-2 w-full max-w-3xl rounded-lg border border-[#7D0A16]/30 bg-gradient-to-r from-[#7D0A16] to-[#5C0810] px-4 py-3 text-sm leading-relaxed text-[#FAF6F0] shadow-sm"
    >
      {verifying ? (
        <span className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin text-[#D0A56A]" aria-hidden="true" />
          Sealing your payment with the North Pole ledger…
        </span>
      ) : verified ? (
        <span className="flex items-start gap-2">
          <BadgeCheck className="mt-0.5 size-4 shrink-0 text-[#D0A56A]" aria-hidden="true" />
          <span>
            <strong>Payment received.</strong>
            {reference ? (
              <>
                {' '}
                Reservation <strong>{reference}</strong> is sealed — Santa&apos;s workshop has
                started on your ritual.
              </>
            ) : (
              ' Your ritual is sealed and Santa’s workshop has started.'
            )}{' '}
            A confirmation letter is on its way to your inbox.
          </span>
        </span>
      ) : (
        <span className="flex items-start gap-2">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-[#D0A56A]" aria-hidden="true" />
          <span>
            Thank you for returning. Your payment is being finalised — you will receive a
            confirmation email within moments.
            {reference ? (
              <>
                {' '}
                Your reference is <strong>{reference}</strong>.
              </>
            ) : null}
          </span>
        </span>
      )}
    </div>
  )
}
