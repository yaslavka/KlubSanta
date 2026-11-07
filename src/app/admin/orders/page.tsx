'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Ban,
  Banknote,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Loader2,
  Search,
  Undo2,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { get, patch } from '@/components/admin/api'
import { CardTableSkeleton, EmptyState, ErrorState } from '@/components/admin/states'
import { PageHeader } from '@/components/admin/page-header'
import { OrderStatusBadge } from '@/components/admin/status-badge'
import { formatDateTime, truncate } from '@/components/admin/format'
import { formatMoney } from '@/lib/site'
import type { OrderActionResult, OrderListItem, PaginatedResponse } from '@/components/admin/types'

const STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'cancelled', label: 'Cancelled' },
]

type ConfirmAction = 'mark_refunded' | 'mark_failed' | 'cancel'

const CONFIRM_META: Record<
  ConfirmAction,
  { title: string; description: string; button: string; icon: React.ComponentType<{ className?: string }> }
> = {
  mark_refunded: {
    title: 'Mark this order as refunded?',
    description:
      'The linked reservation will be cancelled if it was still paid. Original processing fees are generally not returned. The family keeps any keepsake already delivered.',
    button: 'Mark refunded',
    icon: Undo2,
  },
  mark_failed: {
    title: 'Mark this order as failed?',
    description:
      'Pending orders only. Use this when a checkout attempt definitively failed so the ledger reflects reality.',
    button: 'Mark failed',
    icon: XCircle,
  },
  cancel: {
    title: 'Cancel this order?',
    description:
      'Pending orders only. The reservation stays in place — only the payment record is closed as cancelled.',
    button: 'Cancel order',
    icon: Ban,
  },
}

export default function AdminOrdersPage() {
  const [data, setData] = useState<PaginatedResponse<OrderListItem> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)

  // mark_paid dialog
  const [markPaidOrder, setMarkPaidOrder] = useState<OrderListItem | null>(null)
  const [manualRef, setManualRef] = useState('')
  const [markPaidBusy, setMarkPaidBusy] = useState(false)

  // generic confirm dialog
  const [confirmAction, setConfirmAction] = useState<{ order: OrderListItem; action: ConfirmAction } | null>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

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
      setData(await get<PaginatedResponse<OrderListItem>>(`/api/admin/orders?${params.toString()}`))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, debouncedSearch])

  useEffect(() => {
    void load()
  }, [load])

  async function submitMarkPaid() {
    if (!markPaidOrder) return
    setMarkPaidBusy(true)
    try {
      const res = await patch<OrderActionResult>(`/api/admin/orders/${markPaidOrder.id}`, {
        action: 'mark_paid',
        manualRef: manualRef.trim() === '' ? undefined : manualRef.trim(),
      })
      toast.success(res.message)
      setMarkPaidOrder(null)
      setManualRef('')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark order paid')
    } finally {
      setMarkPaidBusy(false)
    }
  }

  async function submitConfirm() {
    if (!confirmAction) return
    setConfirmBusy(true)
    try {
      const res = await patch<OrderActionResult>(`/api/admin/orders/${confirmAction.order.id}`, {
        action: confirmAction.action,
      })
      toast.success(res.message)
      setConfirmAction(null)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update order')
    } finally {
      setConfirmBusy(false)
    }
  }

  function copyRef(value: string) {
    void navigator.clipboard
      .writeText(value)
      .then(() => toast.success('Reference copied to clipboard.'))
      .catch(() => toast.error('Could not copy the reference.'))
  }

  const meta = confirmAction ? CONFIRM_META[confirmAction.action] : null
  const ConfirmIcon = meta?.icon

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle="Payment ledger for every reservation — confirm bank transfers manually or audit Stripe activity."
      />

      <Card className="border-[#D0A56A]/40 bg-white">
        <CardContent className="p-4 md:p-6">
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
                placeholder="Search reference, email or provider ref…"
                className="min-h-11 border-[#D0A56A]/40 bg-white pl-9"
                aria-label="Search orders"
              />
            </div>
          </div>

          {error ? (
            <ErrorState message={error} onRetry={() => void load()} />
          ) : loading && !data ? (
            <CardTableSkeleton cols={7} />
          ) : data && data.items.length === 0 ? (
            <EmptyState
              title="No orders match these filters"
              hint="Orders appear here as soon as a family starts checkout."
            />
          ) : data ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#D0A56A]/30">
                      <TableHead className="text-[#7D0A16]/70">Created</TableHead>
                      <TableHead className="text-[#7D0A16]/70">Booking</TableHead>
                      <TableHead className="text-[#7D0A16]/70">Recipient</TableHead>
                      <TableHead className="text-[#7D0A16]/70">Amount</TableHead>
                      <TableHead className="text-[#7D0A16]/70">Provider</TableHead>
                      <TableHead className="text-[#7D0A16]/70">Status</TableHead>
                      <TableHead className="text-[#7D0A16]/70">Provider ref</TableHead>
                      <TableHead className="text-right text-[#7D0A16]/70">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className={loading ? 'opacity-50' : ''}>
                    {data.items.map((o) => {
                      const ref = o.paymentRef || o.sessionRef
                      return (
                        <TableRow key={o.id} className="border-[#D0A56A]/20 hover:bg-[#7D0A16]/[0.03]">
                          <TableCell className="whitespace-nowrap text-sm text-[#3A0008]/70">
                            {formatDateTime(o.createdAt)}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-medium text-[#7D0A16]">
                            {o.booking.reference}
                          </TableCell>
                          <TableCell className="font-medium text-[#3A0008]">
                            {o.booking.recipientName}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm font-medium text-[#3A0008]">
                            {formatMoney(o.amountCents, o.currency)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="border-[#D0A56A]/50 bg-[#FAF6F0] text-[#7D0A16] capitalize"
                            >
                              {o.provider}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <OrderStatusBadge status={o.status} />
                          </TableCell>
                          <TableCell>
                            {ref ? (
                              <span className="flex items-center gap-1">
                                <span className="font-mono text-xs text-[#3A0008]/70">
                                  {truncate(ref, 22)}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Copy provider reference"
                                  onClick={() => copyRef(ref)}
                                  className="size-9 min-w-9 text-[#7D0A16] hover:bg-[#7D0A16]/10"
                                >
                                  <Copy className="size-3.5" />
                                </Button>
                              </span>
                            ) : (
                              <span className="text-[#7D0A16]/40">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="inline-flex flex-wrap justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={o.status === 'paid'}
                                onClick={() => {
                                  setManualRef('')
                                  setMarkPaidOrder(o)
                                }}
                                className="min-h-9 border-green-300 bg-white px-3 text-green-700 hover:bg-green-50 disabled:opacity-40"
                              >
                                <Banknote className="size-4" /> Mark paid…
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={o.status !== 'paid'}
                                onClick={() => setConfirmAction({ order: o, action: 'mark_refunded' })}
                                className="min-h-9 border-[#D0A56A]/50 bg-white px-3 text-[#7D0A16] hover:bg-[#D0A56A]/10 disabled:opacity-40"
                              >
                                <Undo2 className="size-4" /> Refund
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={o.status !== 'pending'}
                                onClick={() => setConfirmAction({ order: o, action: 'mark_failed' })}
                                className="min-h-9 border-red-300 bg-white px-3 text-red-700 hover:bg-red-50 disabled:opacity-40"
                              >
                                <XCircle className="size-4" /> Fail
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={o.status !== 'pending'}
                                onClick={() => setConfirmAction({ order: o, action: 'cancel' })}
                                className="min-h-9 border-gray-300 bg-white px-3 text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                              >
                                <Ban className="size-4" /> Cancel
                              </Button>
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-sm text-[#7D0A16]/70">
                  {data.total} order{data.total === 1 ? '' : 's'} · page {data.page} of{' '}
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

      {/* Mark paid dialog */}
      <Dialog
        open={markPaidOrder !== null}
        onOpenChange={(open) => {
          if (!open) setMarkPaidOrder(null)
        }}
      >
        <DialogContent className="border-[#D0A56A]/40 bg-[#FAF6F0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-[#3A0008]">
              Confirm payment for {markPaidOrder?.booking.reference}
            </DialogTitle>
            <DialogDescription className="text-[#7D0A16]/70">
              Confirming triggers the full fulfillment pipeline: the booking becomes paid, a keepsake
              generation job is created and the parent is notified by email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="manual-ref" className="text-[#3A0008]">
              Manual reference (optional)
            </Label>
            <Input
              id="manual-ref"
              value={manualRef}
              onChange={(e) => setManualRef(e.target.value)}
              placeholder="e.g. bank transfer IBAN note / wire ID"
              className="min-h-11 border-[#D0A56A]/40 bg-white"
            />
            <p className="text-xs text-[#7D0A16]/60">
              Use this to record a Stripe-independent note, such as a bank transfer reference.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMarkPaidOrder(null)}
              className="min-h-11 border-[#D0A56A]/50 bg-white text-[#7D0A16]"
            >
              Close
            </Button>
            <Button
              onClick={() => void submitMarkPaid()}
              disabled={markPaidBusy}
              className="min-h-11 bg-[#7D0A16] text-[#FAF6F0] hover:bg-[#5C0810]"
            >
              {markPaidBusy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Confirm payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generic action confirm */}
      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null)
        }}
      >
        <AlertDialogContent className="border-[#D0A56A]/40 bg-[#FAF6F0]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-xl text-[#3A0008]">
              {meta?.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#7D0A16]/80">
              {confirmAction
                ? `${meta?.description} Order ${confirmAction.order.booking.reference} · ${formatMoney(confirmAction.order.amountCents, confirmAction.order.currency)}.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 border-[#D0A56A]/50 bg-white text-[#7D0A16]">
              Keep as is
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void submitConfirm()
              }}
              disabled={confirmBusy}
              className="min-h-11 bg-[#7D0A16] text-[#FAF6F0] hover:bg-[#5C0810]"
            >
              {confirmBusy ? <Loader2 className="size-4 animate-spin" /> : null}
              {ConfirmIcon ? <ConfirmIcon className="size-4" /> : null}
              {meta?.button}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
