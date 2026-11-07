// Shared site constants for Klub Santa

export const LANGUAGES = [
  'English',
  'Français',
  'Español',
  'Deutsch',
  'Italiano',
  'Português',
  'Mandarin (中文普通話)',
  'Cantonese (廣東話)',
] as const

export const BOOKING_STATUSES = [
  'new',
  'awaiting_payment',
  'paid',
  'in_production',
  'completed',
  'cancelled',
] as const

export const ORDER_STATUSES = ['pending', 'paid', 'failed', 'refunded', 'cancelled'] as const

export const JOB_STATUSES = [
  'queued',
  'submitted',
  'processing',
  'completed',
  'failed',
  'cancelled',
] as const

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  new: 'New',
  awaiting_payment: 'Awaiting payment',
  paid: 'Paid',
  in_production: 'In production',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
}

export const JOB_STATUS_LABELS: Record<string, string> = {
  queued: 'Queued',
  submitted: 'Submitted',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
}

export function formatMoney(cents: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100)
  } catch {
    return `$${(cents / 100).toFixed(2)}`
  }
}

export function generateBookingReference(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let ref = ''
  for (let i = 0; i < 6; i++) {
    ref += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return `KS-${ref}`
}

// Approved script template per the brief: Santa uses ONLY parent-approved details,
// encourages kindness, never shames, never promises gifts.
export function buildSantaScript(opts: {
  recipientName: string
  language: string
  memoryNote?: string
  planName?: string
}): string {
  const name = opts.recipientName.trim()
  const memory = opts.memoryNote?.trim()
  const lines: string[] = []
  lines.push(`Hello ${name}! This is Santa Claus, calling you all the way from the North Pole.`)
  lines.push(
    `The elves have been telling me wonderful things about you this year${memory ? ` — I heard that ${memory}` : ''}. That is the kind of kindness that makes the whole workshop proud.`
  )
  lines.push(
    `Keep being gentle, curious and brave, ${name}. Remember: the greatest gift of all is the warmth we share with the people we love.`
  )
  lines.push(`Ho ho ho! I am so proud of you, ${name}. Have a wonderful Christmas evening!`)
  lines.push(`(Language for this ritual: ${opts.language}${opts.planName ? ` · Ritual: ${opts.planName}` : ''})`)
  return lines.join('\n')
}
