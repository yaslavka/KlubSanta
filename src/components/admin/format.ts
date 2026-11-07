import { format } from 'date-fns'

/** Format an ISO date string as "MMM d, yyyy HH:mm" (client-safe). */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return '—'
  return format(d, 'MMM d, yyyy HH:mm')
}

/** Truncate long text for tight table cells. */
export function truncate(text: string | null | undefined, max = 28): string {
  if (!text) return '—'
  return text.length > max ? `${text.slice(0, max)}…` : text
}
