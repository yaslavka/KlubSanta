import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/lib/db'
import { formatMoney } from '@/lib/site'
import { verifySandboxPaymentToken } from '@/lib/payments'
import SandboxCheckoutForm from './sandbox-form'
import { CircleAlert, ShieldCheck } from 'lucide-react'

export const dynamic = 'force-dynamic'

// Functional test-gateway page: never a search result.
export const metadata: Metadata = {
  title: 'Sandbox checkout',
  robots: { index: false, follow: false },
}

type PageProps = {
  searchParams: Promise<{ t?: string | string[] }>
}

function ErrorCard({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF6F0] px-4">
      <div className="w-full max-w-md rounded-xl border border-[#D0A56A]/50 bg-white p-6 text-center shadow-sm md:p-8">
        <img src="/media/logo.svg" alt="Klub Santa crest" className="mx-auto size-14" />
        <h1 className="mt-4 font-serif text-2xl font-semibold text-[#7D0A16]">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#3A0008]/70">{hint}</p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-[#7D0A16] px-6 text-sm font-semibold text-[#FAF6F0] transition-colors hover:bg-[#5C0810]"
        >
          Return to Klub Santa
        </Link>
      </div>
    </div>
  )
}

// GET /checkout/sandbox?t=… — the built-in Klub Santa TEST gateway.
// Emulates a hosted checkout page (order summary + card form) and feeds the
// production fulfillment pipeline on success. Active only while no Stripe keys
// are configured; adding STRIPE_SECRET_KEY switches the site to real Stripe
// automatically — this page simply stops being linked.
export default async function SandboxCheckoutPage({ searchParams }: PageProps) {
  const params = await searchParams
  const rawToken = Array.isArray(params.t) ? params.t[0] : params.t
  const verified = rawToken ? verifySandboxPaymentToken(rawToken) : null

  if (!verified) {
    return (
      <ErrorCard
        title="Checkout link expired"
        hint="This secure payment link is no longer valid. Please restart your reservation from the Klub Santa site — your details remain safely stored in the Believer Ledger."
      />
    )
  }

  const order = await db.order.findUnique({
    where: { id: verified.orderId },
    include: { booking: { include: { product: true } } },
  })

  if (!order || order.amountCents !== verified.amountCents) {
    return (
      <ErrorCard
        title="Order not found"
        hint="We could not match this payment link to a reservation. Please contact hello@klubsanta.com and we will sort it out promptly."
      />
    )
  }

  if (order.status === 'paid') {
    return (
      <ErrorCard
        title="Already sealed & paid"
        hint={`Reservation ${order.booking.reference} has already been paid. A confirmation letter is in your inbox — no further payment is needed.`}
      />
    )
  }

  if (order.status !== 'pending') {
    return (
      <ErrorCard
        title="Payment unavailable"
        hint={`The order for reservation ${order.booking.reference} can no longer be paid online (status: ${order.status}). Our keepers of the ledger will assist you.`}
      />
    )
  }

  const productName =
    order.booking.product?.name || order.booking.planName || 'Klub Santa Ritual'

  return (
    <div className="min-h-screen bg-[#FAF6F0] px-4 py-8 md:py-14">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-6 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3">
            <img src="/media/logo.svg" alt="Klub Santa crest" className="size-10" />
            <span className="font-serif text-lg font-semibold text-[#7D0A16]">Klub Santa</span>
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D0A56A]/60 bg-[#D0A56A]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#7D0A16]">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Test mode
          </span>
        </header>

        <div className="overflow-hidden rounded-xl border border-[#D0A56A]/40 bg-white shadow-sm">
          <div className="grid md:grid-cols-[1fr_1.2fr]">
            {/* Order summary */}
            <div className="border-b border-[#D0A56A]/30 bg-gradient-to-b from-[#7D0A16] to-[#3A0008] p-6 text-[#FAF6F0] md:border-b-0 md:border-r md:p-8">
              <p className="text-[11px] uppercase tracking-widest text-[#D0A56A]">
                Reservation {order.booking.reference}
              </p>
              <h1 className="mt-2 font-serif text-2xl font-semibold leading-snug">
                {productName}
              </h1>
              <p className="mt-2 text-sm text-[#FAF6F0]/75">
                Personalised for <strong>{order.booking.recipientName}</strong>
                {order.booking.language ? ` · ${order.booking.language}` : ''}
              </p>

              <div className="mt-6 space-y-2 border-t border-[#D0A56A]/25 pt-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[#FAF6F0]/70">Ritual total</span>
                  <span className="font-semibold">
                    {formatMoney(order.amountCents, order.currency)}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-[#FAF6F0]/55">
                  Paid once. Includes your personalised keepsake, the private archive link and our
                  10% pledge to children&apos;s charities.
                </p>
              </div>

              <div className="mt-6 rounded-lg border border-[#D0A56A]/25 bg-white/5 p-3 text-xs leading-relaxed text-[#FAF6F0]/70">
                <strong className="text-[#D0A56A]">Sandbox gateway.</strong> This is Klub
                Santa&apos;s built-in test checkout — no real money moves. Use the success card or
                a decline card to exercise the full payment &amp; fulfillment pipeline. Switch to
                real Stripe by adding <code className="text-[#D0A56A]">STRIPE_SECRET_KEY</code> to
                the environment.
              </div>
            </div>

            {/* Payment form */}
            <div className="p-6 md:p-8">
              <SandboxCheckoutForm
                token={rawToken as string}
                amountFormatted={formatMoney(order.amountCents, order.currency)}
              />
              <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-[#3A0008]/55">
                <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                Sandbox payments are logged like real ones: the order is marked paid, a generation
                job is queued and confirmation emails are dispatched — everything except the actual
                charge.
              </p>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-[#3A0008]/50">
          Cancel and go back?{' '}
          <Link
            href={`/?checkout=cancelled&ref=${order.booking.reference}`}
            className="font-semibold text-[#7D0A16] underline decoration-[#D0A56A] underline-offset-2 hover:bg-[#D0A56A]/10"
          >
            Return to Klub Santa — your reservation stays saved
          </Link>
        </p>
      </div>
    </div>
  )
}
