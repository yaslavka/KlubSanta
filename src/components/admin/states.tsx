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

/** Table-body loading skeleton (keeps table headers visible). */
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
