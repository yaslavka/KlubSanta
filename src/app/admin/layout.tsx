'use client'

import { usePathname } from 'next/navigation'
import { Toaster } from '@/components/ui/sonner'
import { AdminProvider } from '@/components/admin/admin-provider'
import { AdminShell } from '@/components/admin/admin-shell'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
