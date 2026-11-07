'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminUser } from './types'

export type PaymentMode = 'stripe_live' | 'stripe_test' | 'sandbox'

export interface PaymentsStatus {
  mode: PaymentMode
  stripeConfigured: boolean
  webhookConfigured: boolean
}

interface AdminContextValue {
  admin: AdminUser | null
  /** Payment platform status (sandbox / stripe test / stripe live). */
  payments: PaymentsStatus
  /** Force a re-check of /api/admin/auth/me (e.g. after profile changes). */
  refresh: () => void
}

const DEFAULT_PAYMENTS: PaymentsStatus = {
  mode: 'sandbox',
  stripeConfigured: false,
  webhookConfigured: false,
}

const AdminContext = createContext<AdminContextValue>({
  admin: null,
  payments: DEFAULT_PAYMENTS,
  refresh: () => {},
})

export function useAdmin(): AdminContextValue {
  return useContext(AdminContext)
}

function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-b from-[#7D0A16] to-[#3A0008]">
      <img src="/media/logo.svg" alt="Klub Santa crest" className="size-16 animate-pulse" />
      <p className="font-serif text-sm tracking-wide text-[#D0A56A]">Preparing the sanctuary…</p>
    </div>
  )
}

/**
 * Wraps every authenticated admin page. Fetches /api/admin/auth/me once on
 * mount; on 401 the session is gone so we route back to the login screen.
 * Bumps `attempt` to re-run the check (manual refresh or network retry).
 */
export function AdminProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [payments, setPayments] = useState<PaymentsStatus>(DEFAULT_PAYMENTS)
  const [ready, setReady] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    async function run() {
      try {
        const res = await fetch('/api/admin/auth/me', { credentials: 'same-origin' })
        if (cancelled) return
        if (res.status === 401) {
          router.replace('/admin/login')
          return
        }
        const json: unknown = await res.json()
        const maybeAdmin = (json as { admin?: unknown } | null)?.admin
        if (maybeAdmin !== null && typeof maybeAdmin === 'object') {
          if (!cancelled) {
            setAdmin(maybeAdmin as AdminUser)
            const maybePayments = (json as { payments?: unknown } | null)?.payments
            if (maybePayments !== null && typeof maybePayments === 'object') {
              setPayments(maybePayments as PaymentsStatus)
            }
            setReady(true)
          }
          return
        }
        // Unexpected shape — treat as signed out.
        router.replace('/admin/login')
      } catch {
        // Network hiccup: retry shortly instead of kicking the user out.
        if (!cancelled) {
          retryTimer = setTimeout(() => setAttempt((a) => a + 1), 1500)
        }
      }
    }

    void run()
    return () => {
      cancelled = true
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [router, attempt])

  const value = useMemo<AdminContextValue>(
    () => ({ admin, payments, refresh: () => setAttempt((a) => a + 1) }),
    [admin, payments]
  )

  if (!ready || !admin) return <Splash />

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}
