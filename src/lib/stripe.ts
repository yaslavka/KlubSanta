// Stripe Checkout integration (real code path — activates when STRIPE_SECRET_KEY is set)
import 'server-only'

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

export async function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  const { default: Stripe } = await import('stripe')
  return new Stripe(key)
}

export function getAppUrl(): string {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  )
}
