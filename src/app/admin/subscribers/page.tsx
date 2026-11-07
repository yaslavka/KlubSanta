'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, Loader2, Search, Trash2 } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { del, get } from '@/components/admin/api'
import { EmptyState, ErrorState, TableRowsSkeleton } from '@/components/admin/states'
import { PageHeader } from '@/components/admin/page-header'
import { formatDateTime } from '@/components/admin/format'
import type { Subscriber } from '@/components/admin/types'

export default function AdminSubscribersPage() {
  const [items, setItems] = useState<Subscriber[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [deleting, setDeleting] = useState<Subscriber | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  function handleSearch(value: string) {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(value.trim()), 400)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('q', debouncedSearch)
      const res = await get<{ items: Subscriber[]; total: number }>(
        `/api/admin/subscribers?${params.toString()}`
      )
      setItems(res.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscribers')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch])

  useEffect(() => {
    void load()
  }, [load])

  async function submitDelete() {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await del<{ ok: boolean }>(`/api/admin/subscribers/${deleting.id}`)
      toast.success(`${deleting.email} removed from the list.`)
      setDeleting(null)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete subscriber')
    } finally {
      setDeleteBusy(false)
    }
  }

  const activeCount = items?.filter((s) => !s.unsubscribedAt).length ?? 0

  return (
    <div>
      <PageHeader
        title="Subscribers"
        subtitle="Families who asked for Christmas reminders — export the list for your newsletter tool."
      />

      <Card className="border-[#D0A56A]/40 bg-white">
        <CardContent className="p-4 md:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#D0A56A]" />
              <Input
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search by email…"
                className="min-h-11 border-[#D0A56A]/40 bg-white pl-9"
                aria-label="Search subscribers"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => window.location.assign('/api/admin/subscribers?format=csv')}
              className="min-h-11 border-[#D0A56A]/50 bg-white text-[#7D0A16] hover:bg-[#D0A56A]/10"
            >
              <Download className="size-4" /> Export CSV
            </Button>
          </div>

          <p className="mb-3 text-sm text-[#7D0A16]/70">
            {items
              ? `${items.length} subscriber${items.length === 1 ? '' : 's'} found · ${activeCount} active`
              : ''}
          </p>

          {error ? (
            <ErrorState message={error} onRetry={() => void load()} />
          ) : loading && !items ? (
            <TableRowsSkeleton cols={5} />
          ) : items && items.length === 0 ? (
            <EmptyState
              title="No subscribers match"
              hint="Newsletter signups from the landing page will collect here."
            />
          ) : items ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#D0A56A]/30">
                    <TableHead className="text-[#7D0A16]/70">Email</TableHead>
                    <TableHead className="text-[#7D0A16]/70">Source</TableHead>
                    <TableHead className="text-[#7D0A16]/70">Subscribed</TableHead>
                    <TableHead className="text-[#7D0A16]/70">Status</TableHead>
                    <TableHead className="text-right text-[#7D0A16]/70">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className={loading ? 'opacity-50' : ''}>
                  {items.map((s) => (
                    <TableRow key={s.id} className="border-[#D0A56A]/20 hover:bg-[#7D0A16]/[0.03]">
                      <TableCell className="font-medium text-[#3A0008]">{s.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="border-[#D0A56A]/50 bg-[#FAF6F0] text-[#7D0A16] capitalize"
                        >
                          {s.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-[#3A0008]/70">
                        {formatDateTime(s.createdAt)}
                      </TableCell>
                      <TableCell>
                        {s.unsubscribedAt ? (
                          <Badge
                            variant="outline"
                            className="border-gray-300 bg-gray-100 text-gray-600"
                          >
                            unsubscribed
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-green-300 bg-green-100 text-green-800"
                          >
                            active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleting(s)}
                          className="min-h-9 border-red-300 bg-white px-3 text-red-700 hover:bg-red-50"
                          aria-label={`Delete ${s.email}`}
                        >
                          <Trash2 className="size-4" /> Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Delete confirm */}
      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
      >
        <AlertDialogContent className="border-[#D0A56A]/40 bg-[#FAF6F0]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-xl text-[#3A0008]">
              Remove {deleting?.email}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#7D0A16]/80">
              This permanently deletes the subscriber record. If they still want reminders they can
              sign up again on the landing page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 border-[#D0A56A]/50 bg-white text-[#7D0A16]">
              Keep subscriber
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void submitDelete()
              }}
              disabled={deleteBusy}
              className="min-h-11 bg-red-700 text-white hover:bg-red-800"
            >
              {deleteBusy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
