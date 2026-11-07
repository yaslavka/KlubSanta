'use client'

import { AlertCircle, Inbox, RotateCw } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

/** Full-page loading skeleton used while lists load. */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-10 w-full max-w-sm bg-[#7D0A16]/10" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full bg-[#7D0A16]/[0.07]" />
      ))}
    </div>
  )
}

/** Table-body loading skeleton (keeps table headers visible). Must be rendered inside <TableBody>. */
export function TableRowsSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-[#D0A56A]/20">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-3 py-3">
              <Skeleton className="h-5 w-full max-w-[140px] bg-[#7D0A16]/[0.07]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

/**
 * Div-based table loading skeleton — HTML-valid anywhere (e.g. directly inside
 * CardContent). Use this instead of TableRowsSkeleton when there is no wrapping
 * <table>/<tbody> around the placeholder.
 */
export function CardTableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div
      className="overflow-hidden rounded-lg border border-[#D0A56A]/30 bg-white/60"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="flex gap-3 border-b border-[#D0A56A]/30 bg-[#7D0A16]/[0.04] px-3 py-3">
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} className="h-4 min-w-0 flex-1 bg-[#7D0A16]/10" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3 border-b border-[#D0A56A]/20 px-3 py-3.5 last:border-b-0">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-5 min-w-0 flex-1 bg-[#7D0A16]/[0.07]" />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Error banner with retry action. */
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Alert variant="destructive" className="border-red-300 bg-red-50 text-red-800">
      <AlertCircle className="size-4" />
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>{message}</span>
        <Button
          size="sm"
          variant="outline"
          onClick={onRetry}
          className="min-h-9 border-red-300 bg-white text-red-700 hover:bg-red-50 hover:text-red-800"
        >
          <RotateCw className="size-4" /> Retry
        </Button>
      </AlertDescription>
    </Alert>
  )
}

/** Friendly empty state. */
export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#D0A56A]/50 bg-white/60 px-6 py-12 text-center">
      <Inbox className="size-8 text-[#D0A56A]" />
      <p className="font-serif text-base text-[#3A0008]">{title}</p>
      {hint ? <p className="max-w-md text-sm text-[#7D0A16]/60">{hint}</p> : null}
    </div>
  )
}
