// Payment mode control per the technical brief:
//   stripe_live — STRIPE_SECRET_KEY starts with sk_live_  → real money, battle mode
//   stripe_test — STRIPE_SECRET_KEY is any other live-callable key (sk_test_…) →
//                 real Stripe network in test mode, test cards, no real charges
//   sandbox     — no STRIPE_SECRET_KEY at all → built-in Klub Santa test gateway
//                 (branded hosted-checkout simulator) so the FULL pipeline
//                 booking → payment → fulfillment can be exercised with zero keys.
//
// Switching between modes is a pure environment change — no code edits.
import 'server-only'
import crypto from 'node:crypto'
import { resolveIntegration } from '@/lib/integrations'

export type PaymentMode = 'stripe_live' | 'stripe_test' | 'sandbox'

/** Stripe secret key — admin settings (DB) override the environment. */
export async function getStripeSecretKey(): Promise<string | null> {
  const { value } = await resolveIntegration('STRIPE_SECRET_KEY')
  return value
}

export async function getPaymentMode(): Promise<PaymentMode> {
  const key = await getStripeSecretKey()
  if (!key) return 'sandbox'
  return key.startsWith('sk_live') ? 'stripe_live' : 'stripe_test'
}

export async function isWebhookConfigured(): Promise<boolean> {
  const { value } = await resolveIntegration('STRIPE_WEBHOOK_SECRET')
  return Boolean(value)
}

export async function isStripeConfigured(): Promise<boolean> {
  return (await getPaymentMode()) !== 'sandbox'
}

export async function isLiveMode(): Promise<boolean> {
  return (await getPaymentMode()) === 'stripe_live'
}

/** Summary used by the admin panel (auth/me) and diagnostics. */
export async function getPaymentsStatus(): Promise<{
  mode: PaymentMode
  stripeConfigured: boolean
  webhookConfigured: boolean
}> {
  const [mode, webhookConfigured] = await Promise.all([getPaymentMode(), isWebhookConfigured()])
  return {
    mode,
    stripeConfigured: mode !== 'sandbox',
    webhookConfigured,
  }
}

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  stripe_live: 'Stripe · Live',
  stripe_test: 'Stripe · Test',
  sandbox: 'Sandbox Gateway',
}

// ---------------------------------------------------------------------------
// Sandbox payment tokens — HMAC-signed, short-lived, amount-bound.
// They authorize exactly one action: mark THIS order (at THIS amount) paid via
// the sandbox gateway. Cannot be forged without SESSION_SECRET, cannot be
// replayed after expiry, and the pay endpoint re-checks order state server-side.
// ---------------------------------------------------------------------------

const SANDBOX_TOKEN_TTL_SEC = 60 * 60 * 24 // 24h to complete a sandbox checkout

function sandboxSecret(): string {
  return (
    process.env.SESSION_SECRET?.trim() ||
    'klub-santa-dev-secret-change-me-in-production-0123456789'
  )
}

function b64url(buf: Buffer): string {
  return buf.toString('base64url')
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', sandboxSecret()).update(payload).digest('base64url')
}

export function createSandboxPaymentToken(orderId: string, amountCents: number): string {
  const exp = Math.floor(Date.now() / 1000) + SANDBOX_TOKEN_TTL_SEC
  const nonce = crypto.randomBytes(8).toString('base64url')
  const payload = b64url(Buffer.from(JSON.stringify({ orderId, amountCents, exp, nonce })))
  return `${payload}.${sign(payload)}`
}

export function verifySandboxPaymentToken(
  token: string
): { orderId: string; amountCents: number } | null {
  if (!token || token.length > 2048) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payload, signature] = parts

  const expected = sign(payload)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      orderId?: unknown
      amountCents?: unknown
      exp?: unknown
    }
    if (typeof data.orderId !== 'string' || typeof data.amountCents !== 'number') return null
    if (typeof data.exp !== 'number' || data.exp < Math.floor(Date.now() / 1000)) return null
    return { orderId: data.orderId, amountCents: data.amountCents }
  } catch {
    return null
  }
}

// Test cards honoured by the sandbox gateway (mirrors Stripe's test card rules).
export const SANDBOX_SUCCESS_CARD = '4242424242424242'
export const SANDBOX_DECLINE_CARDS: ReadonlySet<string> = new Set([
  '4000000000000002', // generic decline
  '4000000000000006', // expired card decline
  '4000000000009995', // insufficient funds
])

export function normalizeCardNumber(raw: string): string {
  return raw.replace(/[\s-]/g, '')
}
