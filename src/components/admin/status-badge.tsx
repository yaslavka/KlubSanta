import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Brand-aligned status colors: crimson / gold / ivory family first,
// semantic greens / ambers / reds for state clarity. No blues or indigos.

const BOOKING_COLORS: Record<string, string> = {
  new: 'border-[#7D0A16]/30 bg-[#7D0A16]/10 text-[#7D0A16]',
  awaiting_payment: 'border-orange-300 bg-orange-100 text-orange-800',
  paid: 'border-green-300 bg-green-100 text-green-800',
  in_production: 'border-amber-300 bg-amber-100 text-amber-800',
  completed: 'border-emerald-300 bg-emerald-100 text-emerald-800',
  cancelled: 'border-gray-300 bg-gray-100 text-gray-600',
}

const ORDER_COLORS: Record<string, string> = {
  pending: 'border-amber-300 bg-amber-100 text-amber-800',
  paid: 'border-green-300 bg-green-100 text-green-800',
  failed: 'border-red-300 bg-red-100 text-red-700',
  refunded: 'border-gray-300 bg-gray-100 text-gray-600',
  cancelled: 'border-gray-300 bg-gray-100 text-gray-600',
}

const JOB_COLORS: Record<string, string> = {
  queued: 'border-amber-300 bg-amber-100 text-amber-800',
  submitted: 'border-yellow-300 bg-yellow-100 text-yellow-800',
  processing: 'border-amber-400 bg-amber-200 text-amber-900',
  completed: 'border-emerald-300 bg-emerald-100 text-emerald-800',
  failed: 'border-red-300 bg-red-100 text-red-700',
  cancelled: 'border-gray-300 bg-gray-100 text-gray-600',
}

const EMAIL_COLORS: Record<string, string> = {
  sent: 'border-green-300 bg-green-100 text-green-800',
  queued: 'border-amber-300 bg-amber-100 text-amber-800',
  failed: 'border-red-300 bg-red-100 text-red-700',
  skipped_no_provider: 'border-gray-300 bg-gray-100 text-gray-600',
}

function StatusBadge({
  status,
  label,
  colors,
}: {
  status: string
  label: string
  colors: Record<string, string>
}) {
  return (
    <Badge variant="outline" className={cn('border', colors[status] ?? 'border-gray-300 bg-gray-100 text-gray-600')}>
      {label}
    </Badge>
  )
}

export function BookingStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} label={status.replace(/_/g, ' ')} colors={BOOKING_COLORS} />
}

export function OrderStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} label={status} colors={ORDER_COLORS} />
}

export function JobStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} label={status} colors={JOB_COLORS} />
}

export function EmailStatusBadge({ status }: { status: string }) {
  return (
    <StatusBadge
      status={status}
      label={status === 'skipped_no_provider' ? 'no provider' : status}
      colors={EMAIL_COLORS}
    />
  )
}
