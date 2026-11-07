'use client'

import { useCallback, useEffect, useState } from 'react'
import { Ban, CheckCircle2, ExternalLink, Link2, Loader2, RotateCw } from 'lucide-react'
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
import { JobStatusBadge } from '@/components/admin/status-badge'
import { formatDateTime, truncate } from '@/components/admin/format'
import type { JobActionResult, JobListItem } from '@/components/admin/types'

const STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'queued', label: 'Queued' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function AdminJobsPage() {
  const [items, setItems] = useState<JobListItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')

  const [busyId, setBusyId] = useState<string | null>(null)
  const [cancelJob, setCancelJob] = useState<JobListItem | null>(null)
  const [cancelBusy, setCancelBusy] = useState(false)

  const [completeJob, setCompleteJob] = useState<JobListItem | null>(null)
  const [completeUrl, setCompleteUrl] = useState('')
  const [completeBusy, setCompleteBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await get<{ items: JobListItem[] }>(`/api/admin/jobs?${params.toString()}`)
      setItems(res.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    void load()
  }, [load])

  async function act(job: JobListItem, action: 'retry') {
    setBusyId(job.id)
    try {
      const res = await patch<JobActionResult>(`/api/admin/jobs/${job.id}`, { action })
      if (res.ok) toast.success(res.message)
      else toast.warning(res.message)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update job')
    } finally {
      setBusyId(null)
    }
  }

  async function submitCancel() {
    if (!cancelJob) return
    setCancelBusy(true)
    try {
      const res = await patch<JobActionResult>(`/api/admin/jobs/${cancelJob.id}`, { action: 'cancel' })
      toast.success(res.message)
      setCancelJob(null)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel job')
    } finally {
      setCancelBusy(false)
    }
  }

  async function submitComplete() {
    if (!completeJob) return
    const url = completeUrl.trim()
    if (!url || !/^https?:\/\//i.test(url)) {
      toast.error('Enter a valid URL starting with http:// or https://')
      return
    }
    setCompleteBusy(true)
    try {
      const res = await patch<JobActionResult>(`/api/admin/jobs/${completeJob.id}`, {
        action: 'complete_with_url',
        outputUrl: url,
      })
      toast.success(res.message)
      setCompleteJob(null)
      setCompleteUrl('')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to complete job')
    } finally {
      setCompleteBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Generation jobs"
        subtitle="Durable keepsake production queue — retry failures, cancel strays or complete manually after staff review."
      />

      <Card className="border-[#D0A56A]/40 bg-white">
        <CardContent className="p-4 md:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
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
            <p className="text-sm text-[#7D0A16]/60">
              Showing the 200 most recent jobs for this filter.
            </p>
          </div>

          {error ? (
            <ErrorState message={error} onRetry={() => void load()} />
          ) : loading && !items ? (
            <CardTableSkeleton cols={7} />
          ) : items && items.length === 0 ? (
            <EmptyState
              title="No jobs match this filter"
              hint="Jobs are created automatically when an order is marked paid."
            />
          ) : items ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#D0A56A]/30">
                    <TableHead className="text-[#7D0A16]/70">Created</TableHead>
                    <TableHead className="text-[#7D0A16]/70">Booking</TableHead>
                    <TableHead className="text-[#7D0A16]/70">Provider</TableHead>
                    <TableHead className="text-[#7D0A16]/70">Kind</TableHead>
                    <TableHead className="text-[#7D0A16]/70">Status</TableHead>
                    <TableHead className="text-[#7D0A16]/70">Attempts</TableHead>
                    <TableHead className="text-[#7D0A16]/70">Error</TableHead>
                    <TableHead className="text-[#7D0A16]/70">Keepsake</TableHead>
                    <TableHead className="text-right text-[#7D0A16]/70">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className={loading ? 'opacity-50' : ''}>
                  {items.map((j) => (
                    <TableRow key={j.id} className="border-[#D0A56A]/20 hover:bg-[#7D0A16]/[0.03]">
                      <TableCell className="whitespace-nowrap text-sm text-[#3A0008]/70">
                        {formatDateTime(j.createdAt)}
                      </TableCell>
                      <TableCell>
                        <span className="block font-mono text-xs font-medium text-[#7D0A16]">
                          {j.booking.reference}
                        </span>
                        <span className="block text-xs text-[#3A0008]/80">
                          {j.booking.recipientName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm capitalize text-[#3A0008]/80">{j.provider}</span>
                        <span className="block max-w-[140px] truncate font-mono text-[11px] text-[#7D0A16]/50">
                          {j.providerJobId ? truncate(j.providerJobId, 18) : 'no provider id'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium capitalize text-[#3A0008]">{j.kind}</span>
                      </TableCell>
                      <TableCell>
                        <JobStatusBadge status={j.status} />
                      </TableCell>
                      <TableCell className="text-sm text-[#3A0008]/80">{j.attempts}</TableCell>
                      <TableCell className="max-w-[200px]">
                        {j.error ? (
                          <span title={j.error} className="block truncate text-xs text-red-700">
                            {j.error}
                          </span>
                        ) : (
                          <span className="text-[#7D0A16]/40">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {j.outputUrl ? (
                          <a
                            href={j.outputUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-9 items-center gap-1 text-xs font-medium text-[#7D0A16] underline underline-offset-4 hover:text-[#5C0810]"
                          >
                            <ExternalLink className="size-3.5" /> Open keepsake
                          </a>
                        ) : (
                          <span className="text-[#7D0A16]/40">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex flex-wrap justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busyId === j.id || j.status === 'completed' || j.status === 'cancelled'}
                            onClick={() => void act(j, 'retry')}
                            className="min-h-9 border-[#D0A56A]/50 bg-white px-3 text-[#7D0A16] hover:bg-[#D0A56A]/10 disabled:opacity-40"
                          >
                            {busyId === j.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <RotateCw className="size-4" />
                            )}
                            Retry
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={
                              j.status === 'completed' ||
                              j.status === 'cancelled'
                            }
                            onClick={() => setCancelJob(j)}
                            className="min-h-9 border-gray-300 bg-white px-3 text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                          >
                            <Ban className="size-4" /> Cancel
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={j.status === 'completed'}
                            onClick={() => {
                              setCompleteUrl('')
                              setCompleteJob(j)
                            }}
                            className="min-h-9 border-green-300 bg-white px-3 text-green-700 hover:bg-green-50 disabled:opacity-40"
                          >
                            <Link2 className="size-4" /> Complete manually…
                          </Button>
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Cancel confirm */}
      <AlertDialog
        open={cancelJob !== null}
        onOpenChange={(open) => {
          if (!open) setCancelJob(null)
        }}
      >
        <AlertDialogContent className="border-[#D0A56A]/40 bg-[#FAF6F0]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-xl text-[#3A0008]">
              Cancel this generation job?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#7D0A16]/80">
              {cancelJob
                ? `Job for ${cancelJob.booking.reference} (${cancelJob.booking.recipientName}) will be marked cancelled. You can retry it later or complete it manually if the keepsake was produced outside the system.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 border-[#D0A56A]/50 bg-white text-[#7D0A16]">
              Keep job
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void submitCancel()
              }}
              disabled={cancelBusy}
              className="min-h-11 bg-[#7D0A16] text-[#FAF6F0] hover:bg-[#5C0810]"
            >
              {cancelBusy ? <Loader2 className="size-4 animate-spin" /> : <Ban className="size-4" />}
              Cancel job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete manually dialog */}
      <Dialog
        open={completeJob !== null}
        onOpenChange={(open) => {
          if (!open) setCompleteJob(null)
        }}
      >
        <DialogContent className="border-[#D0A56A]/40 bg-[#FAF6F0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-[#3A0008]">
              Complete manually — {completeJob?.booking.reference}
            </DialogTitle>
            <DialogDescription className="text-[#7D0A16]/70">
              Paste the keepsake URL produced outside the pipeline. The job is verified as complete
              and the parent is emailed the private download link.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="output-url" className="text-[#3A0008]">
              Keepsake URL
            </Label>
            <Input
              id="output-url"
              value={completeUrl}
              onChange={(e) => setCompleteUrl(e.target.value)}
              placeholder="https://…"
              className="min-h-11 border-[#D0A56A]/40 bg-white"
              inputMode="url"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCompleteJob(null)}
              className="min-h-11 border-[#D0A56A]/50 bg-white text-[#7D0A16]"
            >
              Close
            </Button>
            <Button
              onClick={() => void submitComplete()}
              disabled={completeBusy}
              className="min-h-11 bg-[#7D0A16] text-[#FAF6F0] hover:bg-[#5C0810]"
            >
              {completeBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              Complete &amp; notify parent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
