'use client'

// Client-side chrome for the admin area (moved out of layout.tsx so the
// layout itself stays a server component that can export noindex metadata).
import { usePathname } from 'next/navigation'
import { Toaster } from '@/components/ui/sonner'
import { AdminProvider } from '@/components/admin/admin-provider'
import { AdminShell } from '@/components/admin/admin-shell'

export function AdminChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // The login screen renders standalone (no shell, no auth check).
  if (pathname === '/admin/login') {
    return (
      <>
        <Toaster richColors position="top-right" />
        {children}
      </>
    )
  }

  // Every other /admin route sits behind the session check + full shell.
  return (
    <AdminProvider>
      <AdminShell>{children}</AdminShell>
    </AdminProvider>
  )
}
