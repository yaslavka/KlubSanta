'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clapperboard,
  Clock4,
  Gift,
  MailX,
  RefreshCw,
  Users,
  Wallet,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { get } from '@/components/admin/api'
import { ErrorState, ListSkeleton } from '@/components/admin/states'
import { PageHeader } from '@/components/admin/page-header'
import { BookingStatusBadge } from '@/components/admin/status-badge'
import { formatDateTime } from '@/components/admin/format'
import { formatMoney } from '@/lib/site'
import type { StatsResponse } from '@/components/admin/types'
import { cn } from '@/lib/utils'

const QUICK_LINKS = [
  { href: '/admin/bookings', label: 'Reservations', icon: CalendarCheck },
  { href: '/admin/orders', label: 'Orders', icon: Wallet },
  { href: '/admin/jobs', label: 'Generation jobs', icon: Clapperboard },
  { href: '/admin/products', label: 'Rituals', icon: Gift },
  { href: '/admin/subscribers', label: 'Subscribers', icon: Users },
  { href: '/admin/settings', label: 'Settings', icon: CheckCircle2 },
]

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  danger = false,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ComponentType<{ className?: string }>
  danger?: boolean
}) {
  return (
    <Card
      className={cn(
        'border-[#D0A56A]/40 bg-white shadow-sm',
        danger && 'border-red-300 bg-red-50/60'
      )}
    >
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p
            className={cn(
              'text-xs font-medium uppercase tracking-wide text-[#7D0A16]/60',
              danger && 'text-red-700/80'
            )}
          >
            {label}
          </p>
          <p
            className={cn(
              'mt-1 truncate font-serif text-2xl font-semibold text-[#3A0008]',
              danger && 'text-red-700'
            )}
          >
            {value}
          </p>
          {sub ? (
            <p className={cn('mt-0.5 text-xs text-[#7D0A16]/60', danger && 'text-red-700/70')}>
              {sub}
            </p>
          ) : null}
        </div>
        <div
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-full bg-[#7D0A16]/10 text-[#7D0A16]',
            danger && 'bg-red-100 text-red-600'
          )}
        >
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setStats(await get<StatsResponse>('/api/admin/stats'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const maxLangCount = stats ? Math.max(1, ...stats.byLanguage.map((l) => l.count)) : 1

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader
          title="Dashboard"
          subtitle="A live glance at the workshop: reservations, payments, keepsake generation and outreach."
        />
        <Button
          variant="outline"
          onClick={() => void load()}
          disabled={loading}
          className="mb-6 min-h-11 border-[#D0A56A]/50 bg-white text-[#7D0A16] hover:bg-[#D0A56A]/10"
        >
          <RefreshCw className={cn('size-4', loading && 'animate-spin')} /> Refresh
        </Button>
      </div>

      {loading ? (
        <ListSkeleton rows={6} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : stats ? (
        <div className="space-y-8">
          {/* Stat cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="New bookings"
              value={String(stats.bookings.new)}
              sub={`${stats.bookings.total} total`}
              icon={CalendarCheck}
            />
            <StatCard
              label="Awaiting payment"
              value={String(stats.bookings.awaitingPayment)}
              sub="pending checkout"
              icon={Clock4}
            />
            <StatCard
              label="Completed"
              value={String(stats.bookings.completed)}
              sub="rituals delivered"
              icon={CheckCircle2}
            />
            <StatCard
              label="Revenue"
              value={formatMoney(stats.revenue.cents, stats.revenue.currencies[0] || 'USD')}
              sub={`${stats.revenue.paidOrders} paid orders`}
              icon={Wallet}
            />
            <StatCard
              label="Subscribers"
              value={String(stats.subscribers)}
              sub="newsletter list"
              icon={Users}
            />
            <StatCard
              label="Active jobs"
              value={String(stats.jobs.active)}
              sub={`${stats.jobs.failed} failed`}
              icon={Clapperboard}
              danger={stats.jobs.failed > 0}
            />
            <StatCard
              label="Failed emails"
              value={String(stats.emailsFailed)}
              sub="check the email log"
              icon={MailX}
              danger={stats.emailsFailed > 0}
            />
            <StatCard
              label="Active products"
              value={String(stats.productCount)}
              sub="live on the landing page"
              icon={Gift}
            />
          </div>

          {/* Reservations by language */}
          <Card className="border-[#D0A56A]/40 bg-white">
            <CardHeader>
              <CardTitle className="font-serif text-lg text-[#3A0008]">
                Reservations by language
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.byLanguage.length === 0 ? (
                <p className="text-sm text-[#7D0A16]/60">No reservations yet.</p>
              ) : (
                <div className="space-y-3">
                  {stats.byLanguage.map((lang) => (
                    <div key={lang.language} className="flex items-center gap-3">
                      <span className="w-44 shrink-0 truncate text-sm text-[#3A0008]">
                        {lang.language}
                      </span>
                      <div className="h-6 flex-1 overflow-hidden rounded-full bg-[#7D0A16]/[0.06]">
                        <div
                          className="flex h-full items-center justify-end rounded-full bg-gradient-to-r from-[#7D0A16] to-[#5C0810] pr-2"
                          style={{ width: `${Math.max(8, (lang.count / maxLangCount) * 100)}%` }}
                        >
                          <span className="text-[11px] font-semibold text-[#FAF6F0]">
                            {lang.count}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent reservations */}
          <Card className="border-[#D0A56A]/40 bg-white">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="font-serif text-lg text-[#3A0008]">
                Recent reservations
              </CardTitle>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="min-h-9 text-[#7D0A16] hover:bg-[#7D0A16]/10 hover:text-[#7D0A16]"
              >
                <Link href="/admin/bookings">
                  View all <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#D0A56A]/30">
                      <TableHead className="text-[#7D0A16]/70">Reference</TableHead>
                      <TableHead className="text-[#7D0A16]/70">Recipient</TableHead>
                      <TableHead className="text-[#7D0A16]/70">Ritual</TableHead>
                      <TableHead className="text-[#7D0A16]/70">Language</TableHead>
                      <TableHead className="text-[#7D0A16]/70">Status</TableHead>
                      <TableHead className="text-[#7D0A16]/70">Created</TableHead>
                      <TableHead className="text-[#7D0A16]/70">Parent email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recentBookings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-sm text-[#7D0A16]/60">
                          No reservations yet — they will appear here the moment a family books.
                        </TableCell>
                      </TableRow>
                    ) : (
                      stats.recentBookings.map((b) => (
                        <TableRow key={b.id} className="border-[#D0A56A]/20 hover:bg-[#7D0A16]/[0.03]">
                          <TableCell className="whitespace-nowrap font-mono text-xs font-medium text-[#7D0A16]">
                            <Link
                              href="/admin/bookings"
                              className="underline-offset-4 hover:underline"
                            >
                              {b.reference}
                            </Link>
                          </TableCell>
                          <TableCell className="font-medium text-[#3A0008]">{b.recipientName}</TableCell>
                          <TableCell className="text-sm text-[#3A0008]/80">{b.planName || '—'}</TableCell>
                          <TableCell className="text-sm text-[#3A0008]/80">{b.language}</TableCell>
                          <TableCell>
                            <BookingStatusBadge status={b.status} />
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-[#3A0008]/70">
                            {formatDateTime(b.createdAt)}
                          </TableCell>
                          <TableCell className="max-w-[180px] truncate text-sm text-[#3A0008]/70">
                            {b.parentEmail}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Quick links */}
          <div>
            <h2 className="mb-3 font-serif text-lg text-[#3A0008]">Quick links</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {QUICK_LINKS.map((link) => {
                const Icon = link.icon
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group flex min-h-20 flex-col justify-between gap-2 rounded-lg border border-[#D0A56A]/40 bg-white p-3 shadow-sm transition-colors hover:border-[#7D0A16]/50 hover:bg-[#7D0A16]/5"
                  >
                    <Icon className="size-5 text-[#7D0A16]" />
                    <span className="flex items-center gap-1 text-sm font-medium text-[#3A0008]">
                      {link.label}
                      <ArrowRight className="size-3.5 text-[#D0A56A] transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>

          <Badge variant="outline" className="border-[#D0A56A]/50 text-[#7D0A16]/70">
            Numbers refresh every time this page loads
          </Badge>
        </div>
      ) : null}
    </div>
  )
}
