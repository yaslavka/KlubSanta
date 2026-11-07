// Stripe Checkout integration (real code path — activates when STRIPE_SECRET_KEY
// is set via the admin panel or the environment).
import 'server-only'
import { resolveIntegration } from '@/lib/integrations'

/** Resolves the Stripe secret key: admin settings (DB) first, env fallback. */
export async function resolveStripeSecretKey(): Promise<string | null> {
  const { value } = await resolveIntegration('STRIPE_SECRET_KEY')
  return value
}

export async function isStripeConfigured(): Promise<boolean> {
  return Boolean(await resolveStripeSecretKey())
}

/** Which keys are active — used for mode labels in the admin panel. */
export function stripeKeyMode(key: string): 'live' | 'test' {
  return key.startsWith('sk_live') ? 'live' : 'test'
}

export async function getStripe() {
  const key = await resolveStripeSecretKey()
  if (!key) return null
  const { default: Stripe } = await import('stripe')
  return new Stripe(key)
}

/**
 * Stripe instance for webhook signature verification. Signature checks are
 * pure local crypto (no API calls), so an instance without a configured API
 * key is enough — this lets sites receive webhooks even before the secret
 * key is entered (e.g. webhook secret pasted first).
 */
export async function getStripeForWebhook() {
  const key = await resolveStripeSecretKey()
  const { default: Stripe } = await import('stripe')
  return new Stripe(key ?? 'sk_placeholder_signature_verification_only')
}

export async function getStripeWebhookSecret(): Promise<string | null> {
  const { value } = await resolveIntegration('STRIPE_WEBHOOK_SECRET')
  return value
}

export function getAppUrl(): string {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  )
}
