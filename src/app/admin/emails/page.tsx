'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Info, Search } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { get } from '@/components/admin/api'
import { EmptyState, ErrorState, TableRowsSkeleton } from '@/components/admin/states'
import { PageHeader } from '@/components/admin/page-header'
import { EmailStatusBadge } from '@/components/admin/status-badge'
import { formatDateTime, truncate } from '@/components/admin/format'
import type { EmailLogItem, PaginatedResponse } from '@/components/admin/types'

const STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'queued', label: 'Queued' },
  { value: 'sent', label: 'Sent' },
  { value: 'failed', label: 'Failed' },
  { value: 'skipped_no_provider', label: 'Skipped (no provider)' },
]

export default function AdminEmailsPage() {
  const [data, setData] = useState<PaginatedResponse<EmailLogItem> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)

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
      setData(await get<PaginatedResponse<EmailLogItem>>(`/api/admin/emails?${params.toString()}`))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load email log')
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
        title="Email log"
        subtitle="Every outbound message — confirmations, payment receipts and keepsake delivery notes."
      />

      <Alert className="mb-4 border-[#D0A56A]/50 bg-[#D0A56A]/10 text-[#3A0008]">
        <Info className="size-4 text-[#7D0A16]" />
        <AlertTitle className="font-serif text-[#7D0A16]">Delivery provider</AlertTitle>
        <AlertDescription className="text-[#3A0008]/80">
          Emails are delivered via Resend when RESEND_API_KEY is configured. Without it, every
          message is still logged here (skipped_no_provider) so nothing is lost.
        </AlertDescription>
      </Alert>

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
              <SelectTrigger className="min-h-11 w-full border-[#D0A56A]/40 bg-white sm:w-60">
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
                placeholder="Search recipient or subject…"
                className="min-h-11 border-[#D0A56A]/40 bg-white pl-9"
                aria-label="Search emails"
              />
            </div>
          </div>

          {error ? (
            <ErrorState message={error} onRetry={() => void load()} />
          ) : loading && !data ? (
            <TableRowsSkeleton cols={7} />
          ) : data && data.items.length === 0 ? (
            <EmptyState
              title="No emails match these filters"
              hint="Booking confirmations and keepsake deliveries will be logged here."
            />
          ) : data ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#D0A56A]/30">
                      <TableHead className="text-[#7D0A16]/70">Created</TableHead>
                      <TableHead className="text-[#7D0A16]/70">To</TableHead>
                      <TableHead className="text-[#7D0A16]/70">Subject</TableHead>
                      <TableHead className="text-[#7D0A16]/70">Template</TableHead>
                      <TableHead className="text-[#7D0A16]/70">Status</TableHead>
                      <TableHead className="text-[#7D0A16]/70">Provider ID</TableHead>
                      <TableHead className="text-[#7D0A16]/70">Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className={loading ? 'opacity-50' : ''}>
                    {data.items.map((e) => (
                      <TableRow key={e.id} className="border-[#D0A56A]/20 hover:bg-[#7D0A16]/[0.03]">
                        <TableCell className="whitespace-nowrap text-sm text-[#3A0008]/70">
                          {formatDateTime(e.createdAt)}
                        </TableCell>
                        <TableCell className="font-medium text-[#3A0008]">{e.toEmail}</TableCell>
                        <TableCell className="max-w-[220px] text-sm text-[#3A0008]/80">
                          <span title={e.subject} className="block truncate">
                            {e.subject}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-[#7D0A16]/80">{e.template}</span>
                        </TableCell>
                        <TableCell>
                          <EmailStatusBadge status={e.status} />
                        </TableCell>
                        <TableCell className="max-w-[160px]">
                          {e.providerId ? (
                            <span
                              title={e.providerId}
                              className="block truncate font-mono text-xs text-[#3A0008]/70"
                            >
                              {truncate(e.providerId, 20)}
                            </span>
                          ) : (
                            <span className="text-[#7D0A16]/40">—</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          {e.error ? (
                            <span title={e.error} className="block truncate text-xs text-red-700">
                              {e.error}
                            </span>
                          ) : (
                            <span className="text-[#7D0A16]/40">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-sm text-[#7D0A16]/70">
                  {data.total} message{data.total === 1 ? '' : 's'} · page {data.page} of{' '}
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
    </div>
  )
}
