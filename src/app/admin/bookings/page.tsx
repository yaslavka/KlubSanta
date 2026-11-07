'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Save, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { get, patch } from '@/components/admin/api'
import { CardTableSkeleton, EmptyState, ErrorState } from '@/components/admin/states'
import { PageHeader } from '@/components/admin/page-header'
import { BookingStatusBadge, JobStatusBadge, OrderStatusBadge } from '@/components/admin/status-badge'
import { formatDateTime, truncate } from '@/components/admin/format'
import { formatMoney } from '@/lib/site'
import type { BookingDetail, BookingListItem, BookingListResponse } from '@/components/admin/types'

const STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'new', label: 'New' },
  { value: 'awaiting_payment', label: 'Awaiting payment' },
  { value: 'paid', label: 'Paid' },
  { value: 'in_production', label: 'In production' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-start gap-2 py-1.5 text-sm">
      <span className="font-medium text-[#7D0A16]/70">{label}</span>
      <span className="min-w-0 break-words text-[#3A0008]">{value}</span>
    </div>
  )
}

function BookingDetailDialog({
  bookingId,
  onSaved,
}: {
  bookingId: string
  onSaved: () => void
}) {
  const [detail, setDetail] = useState<BookingDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('new')
  const [adminNote, setAdminNote] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const data = await get<{ booking: BookingDetail }>(`/api/admin/bookings/${bookingId}`)
      setDetail(data.booking)
      setStatus(data.booking.status)
      setAdminNote(data.booking.adminNote ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load booking')
    }
  }, [bookingId])

  useEffect(() => {
    void load()
  }, [load])

  async function handleSave() {
    if (!detail) return
    setSaving(true)
    try {
      const res = await patch<{ booking: BookingDetail }>(`/api/admin/bookings/${detail.id}`, {
        status,
        adminNote: adminNote.trim() === '' ? null : adminNote,
      })
      setDetail((prev) => (prev ? { ...prev, ...res.booking } : prev))
      toast.success(`Reservation ${res.booking.reference} updated.`)
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update booking')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto border-[#D0A56A]/40 bg-[#FAF6F0] sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle className="flex flex-wrap items-center gap-2 font-serif text-xl text-[#3A0008]">
          {detail ? (
            <>
              {detail.reference}
              <BookingStatusBadge status={detail.status} />
            </>
          ) : (
            'Reservation'
          )}
        </DialogTitle>
        <DialogDescription className="text-[#7D0A16]/70">
          Full reservation record, payments and keepsake jobs.
        </DialogDescription>
      </DialogHeader>

      {error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : !detail ? (
        <div className="flex items-center justify-center py-10 text-sm text-[#7D0A16]/60">
          <Loader2 className="mr-2 size-4 animate-spin" /> Loading reservation…
        </div>
      ) : (
        <Tabs defaultValue="details">
          <TabsList className="bg-[#7D0A16]/10">
            <TabsTrigger
              value="details"
              className="data-[state=active]:bg-white data-[state=active]:text-[#7D0A16]"
            >
              Details
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="data-[state=active]:bg-white data-[state=active]:text-[#7D0A16]"
            >
              Orders ({detail.orders.length})
            </TabsTrigger>
            <TabsTrigger
              value="jobs"
              className="data-[state=active]:bg-white data-[state=active]:text-[#7D0A16]"
            >
              Jobs ({detail.jobs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4 space-y-4">
            <div>
              <DetailRow label="Recipient" value={detail.recipientName} />
              <DetailRow
                label="Pronunciation"
                value={
                  detail.pronunciation || <span className="text-[#7D0A16]/40">Not provided</span>
                }
              />
              <DetailRow
                label="Age range"
                value={detail.ageRange || <span className="text-[#7D0A16]/40">Not provided</span>}
              />
              <DetailRow label="Language" value={detail.language} />
              <DetailRow label="Parent email" value={detail.parentEmail} />
              <DetailRow label="Ritual plan" value={detail.planName || detail.product?.name || '—'} />
              <DetailRow
                label="Price"
                value={
                  detail.product
                    ? formatMoney(detail.product.priceCents, detail.product.currency)
                    : '—'
                }
              />
              <DetailRow
                label="Scheduled for"
                value={detail.scheduledFor || <span className="text-[#7D0A16]/40">Not scheduled</span>}
              />
              <DetailRow
                label="Memory note"
                value={detail.memoryNote || <span className="text-[#7D0A16]/40">None</span>}
              />
              <DetailRow label="Created" value={formatDateTime(detail.createdAt)} />
              <DetailRow label="Updated" value={formatDateTime(detail.updatedAt)} />
            </div>

            <Separator className="bg-[#D0A56A]/30" />

            <div className="space-y-2">
              <Label htmlFor="booking-status" className="text-[#3A0008]">
                Status
              </Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger
                  id="booking-status"
                  className="min-h-11 w-full border-[#D0A56A]/40 bg-white sm:w-64"
                >
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTERS.filter((s) => s.value !== 'all').map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Label htmlFor="booking-note" className="block pt-2 text-[#3A0008]">
                Internal admin note
              </Label>
              <Textarea
                id="booking-note"
                rows={3}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Notes for staff only — never shown to the family."
                className="border-[#D0A56A]/40 bg-white"
              />
              <Button
                onClick={() => void handleSave()}
                disabled={saving}
                className="min-h-11 bg-[#7D0A16] text-[#FAF6F0] hover:bg-[#5C0810]"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save changes
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="orders" className="mt-4">
            {detail.orders.length === 0 ? (
              <p className="py-4 text-sm text-[#7D0A16]/60">No orders for this reservation yet.</p>
            ) : (
              <div className="space-y-3">
                {detail.orders.map((o) => (
                  <div
                    key={o.id}
                    className="rounded-lg border border-[#D0A56A]/40 bg-white p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs text-[#7D0A16]">#{o.id.slice(-8)}</span>
                      <OrderStatusBadge status={o.status} />
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[#3A0008]">
                      <span>
                        Amount: <strong>{formatMoney(o.amountCents, o.currency)}</strong>
                      </span>
                      <span>Provider: {o.provider}</span>
                      <span className="col-span-2 break-all text-xs text-[#7D0A16]/70">
                        {o.sessionRef ? `session ${truncate(o.sessionRef, 42)}` : ''}
                        {o.sessionRef && o.paymentRef ? ' · ' : ''}
                        {o.paymentRef ? `payment ${truncate(o.paymentRef, 42)}` : ''}
                        {!o.sessionRef && !o.paymentRef ? 'No provider reference yet' : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="jobs" className="mt-4">
            {detail.jobs.length === 0 ? (
              <p className="py-4 text-sm text-[#7D0A16]/60">No generation jobs yet.</p>
            ) : (
              <div className="space-y-3">
                {detail.jobs.map((j) => (
                  <div
                    key={j.id}
                    className="rounded-lg border border-[#D0A56A]/40 bg-white p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium capitalize text-[#3A0008]">{j.kind}</span>
                      <JobStatusBadge status={j.status} />
                    </div>
                    {j.error ? (
                      <p className="mt-1 break-words text-xs text-red-700">Error: {j.error}</p>
                    ) : null}
                    {j.outputUrl ? (
                      <a
                        href={j.outputUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs font-medium text-[#7D0A16] underline underline-offset-4"
                      >
                        Open keepsake
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </DialogContent>
  )
}

export default function AdminBookingsPage() {
  const [data, setData] = useState<BookingListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)

  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Debounce the search input by 400ms.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  function handleSearch(value: string) {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value.trim())
      setPage(1)
    }, 400)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (debouncedSearch) params.set('q', debouncedSearch)
      setData(await get<BookingListResponse>(`/api/admin/bookings?${params.toString()}`))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, debouncedSearch])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div>
      <PageHeader
        title="Reservations"
        subtitle="Every family booking with its payment and keepsake generation trail."
      />

      <Card className="border-[#D0A56A]/40 bg-white">
        <CardContent className="p-4 md:p-6">
          {/* Filters */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="min-h-11 w-full border-[#D0A56A]/40 bg-white sm:w-56">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#D0A56A]" />
              <Input
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search reference, recipient, email or plan…"
                className="min-h-11 border-[#D0A56A]/40 bg-white pl-9"
                aria-label="Search bookings"
              />
            </div>
          </div>

          {error ? (
            <ErrorState message={error} onRetry={() => void load()} />
          ) : loading && !data ? (
            <CardTableSkeleton cols={8} />
          ) : data && data.items.length === 0 ? (
            <EmptyState
              title="No reservations match these filters"
              hint="Try clearing the search box or choosing another status."
            />
          ) : data ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#D0A56A]/30">
                      <TableHead className="text-[#7D0A16]/70">Reference</TableHead>
                      <TableHead className="text-[#7D0A16]/70">Recipient</TableHead>
                      <TableHead className="text-[#7D0A16]/70">Plan</TableHead>
                      <TableHead className="text-[#7D0A16]/70">Language</TableHead>
                      <TableHead className="text-[#7D0A16]/70">Status</TableHead>
                      <TableHead className="text-[#7D0A16]/70">Orders</TableHead>
                      <TableHead className="text-[#7D0A16]/70">Jobs</TableHead>
                      <TableHead className="text-[#7D0A16]/70">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className={loading ? 'opacity-50' : ''}>
                    {data.items.map((b: BookingListItem) => {
                      const firstOrder = b.orders[0]
                      return (
                        <TableRow
                          key={b.id}
                          onClick={() => setSelectedId(b.id)}
                          className="cursor-pointer border-[#D0A56A]/20 hover:bg-[#7D0A16]/[0.04]"
                        >
                          <TableCell className="whitespace-nowrap font-mono text-xs font-medium text-[#7D0A16]">
                            {b.reference}
                          </TableCell>
                          <TableCell>
                            <span className="block font-medium text-[#3A0008]">
                              {b.recipientName}
                            </span>
                            <span className="block text-xs text-[#7D0A16]/60">{b.parentEmail}</span>
                          </TableCell>
                          <TableCell className="text-sm text-[#3A0008]/80">
                            {b.planName || b.product?.name || '—'}
                          </TableCell>
                          <TableCell className="text-sm text-[#3A0008]/80">{b.language}</TableCell>
                          <TableCell>
                            <BookingStatusBadge status={b.status} />
                          </TableCell>
                          <TableCell className="text-sm">
                            {firstOrder ? (
                              <span className="flex flex-col gap-1">
                                <OrderStatusBadge status={firstOrder.status} />
                                <span className="text-xs text-[#3A0008]/70">
                                  {formatMoney(firstOrder.amountCents, firstOrder.currency)}
                                </span>
                              </span>
                            ) : (
                              <span className="text-[#7D0A16]/40">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {b.jobs.length === 0 ? (
                              <span className="text-[#7D0A16]/40">—</span>
                            ) : (
                              <span className="flex flex-wrap gap-1">
                                {b.jobs.slice(0, 3).map((j) => (
                                  <JobStatusBadge key={j.id} status={j.status} />
                                ))}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-[#3A0008]/70">
                            {formatDateTime(b.createdAt)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-sm text-[#7D0A16]/70">
                  {data.total} reservation{data.total === 1 ? '' : 's'} · page {data.page} of{' '}
                  {data.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={data.page <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="min-h-11 border-[#D0A56A]/50 bg-white text-[#7D0A16] hover:bg-[#D0A56A]/10"
                  >
                    <ChevronLeft className="size-4" /> Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={data.page >= data.totalPages || loading}
                    onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                    className="min-h-11 border-[#D0A56A]/50 bg-white text-[#7D0A16] hover:bg-[#D0A56A]/10"
                  >
                    Next <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={selectedId !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        {selectedId ? <BookingDetailDialog bookingId={selectedId} onSaved={() => void load()} /> : null}
      </Dialog>
    </div>
  )
}
