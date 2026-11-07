'use client'

import { useState } from 'react'
import { CreditCard, Loader2, LockKeyhole, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

type PayResponse = {
  ok?: boolean
  alreadyPaid?: boolean
  redirect?: string
  code?: string
  error?: string
}

type Props = {
  token: string
  amountFormatted: string
}

const SUCCESS_CARD = '4242 4242 4242 4242'
const DECLINE_CARD = '4000 0000 0000 0002'

function formatCardNumber(value: string): string {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 19)
  return digits.replace(/(.{4})/g, '$1 ').trim()
}

function formatExpiry(value: string): string {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

/** Card form for the sandbox gateway (mirrors Stripe's hosted checkout UX). */
export default function SandboxCheckoutForm({ token, amountFormatted }: Props) {
  const [number, setNumber] = useState('')
  const [name, setName] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [status, setStatus] = useState<'idle' | 'processing' | 'declined' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  function fill(kind: 'success' | 'decline') {
    setNumber(kind === 'success' ? SUCCESS_CARD : DECLINE_CARD)
    setName(name || 'Test Believer')
    setExpiry('12/34')
    setCvc('424')
    setStatus('idle')
    setMessage(null)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === 'processing') return

    setStatus('processing')
    setMessage(null)
    try {
      const res = await fetch('/api/checkout/sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          card: { number: number.replace(/\s/g, ''), name, expiry, cvc },
        }),
      })
      const data = (await res.json().catch(() => null)) as PayResponse | null

      if (res.ok && data?.ok && data.redirect) {
        window.location.href = data.redirect
        return
      }
      if (res.status === 402 || data?.code === 'card_declined') {
        setStatus('declined')
        setMessage(data?.error ?? 'Your card was declined.')
        return
      }
      setStatus('error')
      setMessage(data?.error ?? 'Payment could not be processed. Please try again.')
    } catch {
      setStatus('error')
      setMessage('The payment line to the North Pole is busy. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-serif text-lg font-semibold text-[#7D0A16]">Card details</h2>
        <span className="flex items-center gap-1 text-xs text-[#3A0008]/55">
          <LockKeyhole className="size-3.5" aria-hidden="true" /> Test environment
        </span>
      </div>

      {status === 'declined' ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-[#7D0A16]/30 bg-[#7D0A16]/5 p-3 text-sm text-[#7D0A16]"
        >
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            <strong>Payment declined.</strong> {message} — try the success card below.
          </span>
        </div>
      ) : null}
      {status === 'error' && message ? (
        <div role="alert" className="rounded-md border border-[#D0A56A]/60 bg-[#D0A56A]/10 p-3 text-sm text-[#3A0008]">
          {message}
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="sbx-card-number" className="text-[#3A0008]">
          Card number
        </Label>
        <div className="relative">
          <CreditCard
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#7D0A16]/40"
            aria-hidden="true"
          />
          <Input
            id="sbx-card-number"
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="4242 4242 4242 4242"
            required
            value={number}
            onChange={(e) => {
              setNumber(formatCardNumber(e.target.value))
              if (status === 'declined' || status === 'error') {
                setStatus('idle')
                setMessage(null)
              }
            }}
            className="min-h-11 pl-9 font-mono tracking-wider"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sbx-card-name" className="text-[#3A0008]">
          Name on card
        </Label>
        <Input
          id="sbx-card-name"
          autoComplete="cc-name"
          placeholder="T. Believer"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-h-11"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="sbx-card-expiry" className="text-[#3A0008]">
            Expiry (MM/YY)
          </Label>
          <Input
            id="sbx-card-expiry"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="12/34"
            required
            value={expiry}
            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
            className="min-h-11 font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sbx-card-cvc" className="text-[#3A0008]">
            CVC
          </Label>
          <Input
            id="sbx-card-cvc"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="424"
            required
            value={cvc}
            onChange={(e) => setCvc(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
            className="min-h-11 font-mono"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={status === 'processing'}
        className="min-h-12 w-full bg-[#7D0A16] text-base font-semibold text-[#FAF6F0] hover:bg-[#5C0810] disabled:opacity-60"
      >
        {status === 'processing' ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Sealing the ritual…
          </>
        ) : (
          <>Pay {amountFormatted}</>
        )}
      </Button>

      <Separator className="bg-[#D0A56A]/30" />

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#7D0A16]/60">
          Sandbox test cards
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => fill('success')}
            className="min-h-10 border-[#D0A56A]/50 bg-white font-mono text-xs text-[#7D0A16] hover:bg-[#D0A56A]/10"
          >
            {SUCCESS_CARD} · succeeds
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => fill('decline')}
            className="min-h-10 border-[#D0A56A]/50 bg-white font-mono text-xs text-[#7D0A16] hover:bg-[#D0A56A]/10"
          >
            {DECLINE_CARD} · declined
          </Button>
        </div>
      </div>
    </form>
  )
}
