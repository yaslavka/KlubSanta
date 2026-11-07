// Integration configuration resolution: admin-panel Settings (DB) override
// environment variables. This lets the client configure their AI video
// provider (HeyGen), payment gateway (Stripe) and email (Resend) directly
// from the admin panel — no server access required — while env vars remain
// the deployment-level fallback (per the brief: server-only credentials).
//
// Security: secret values are masked whenever returned to any client (the
// raw values are only read server-side at call time). Editing integration
// keys is restricted to the `owner` role (see /api/admin/settings).
import 'server-only'
import { db } from '@/lib/db'

export const INTEGRATION_SECRET_KEYS = [
  'HEYGEN_API_KEY',
  'HEYGEN_SANTA_AVATAR_ID',
  'HEYGEN_SANTA_VOICE_ID',
  'HEYGEN_WEBHOOK_SECRET',
  'HEYGEN_MODE',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'EMAIL_FROM',
] as const

export type IntegrationKey = (typeof INTEGRATION_SECRET_KEYS)[number]

const SECRET_PATTERN = /(KEY|SECRET|PASSWORD|TOKEN)/i

export function isSecretKey(key: string): boolean {
  return SECRET_PATTERN.test(key)
}

/** Mask a secret for display: keeps a short tail so the owner can recognise it. */
export function maskValue(value: string): string {
  if (value.length <= 6) return '••••••'
  return `${'•'.repeat(Math.min(18, value.length - 4))}${value.slice(-4)}`
}

/**
 * Resolve an integration value: DB Setting first (admin panel), env fallback.
 * Empty DB values are treated as "not set" so admins can clear an override.
 */
export async function resolveIntegration(key: string): Promise<{
  value: string | null
  source: 'db' | 'env' | 'none'
}> {
  try {
    const row = await db.setting.findUnique({ where: { key } })
    if (row && row.value.trim()) return { value: row.value.trim(), source: 'db' }
  } catch (e) {
    console.error(`resolveIntegration(${key}) db lookup failed`, e)
  }
  const env = process.env[key]?.trim()
  if (env) return { value: env, source: 'env' }
  return { value: null, source: 'none' }
}

export type IntegrationStatusItem = {
  key: IntegrationKey
  configured: boolean
  source: 'db' | 'env' | 'none'
  masked: string | null
}

/** Status of every integration key, masked for client display. */
export async function getIntegrationStatus(): Promise<IntegrationStatusItem[]> {
  const items: IntegrationStatusItem[] = []
  for (const key of INTEGRATION_SECRET_KEYS) {
    const { value, source } = await resolveIntegration(key)
    items.push({
      key,
      configured: Boolean(value),
      source,
      masked: value ? maskValue(value) : null,
    })
  }
  return items
}
