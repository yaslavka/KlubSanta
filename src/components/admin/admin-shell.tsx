'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  CalendarCheck,
  Clapperboard,
  CreditCard,
  ExternalLink,
  Gift,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MessagesSquare,
  Settings,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Toaster } from '@/components/ui/sonner'
import { post } from './api'
import { useAdmin } from './admin-provider'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/bookings', label: 'Reservations', icon: CalendarCheck, exact: false },
  { href: '/admin/orders', label: 'Orders', icon: CreditCard, exact: false },
  { href: '/admin/jobs', label: 'Generation jobs', icon: Clapperboard, exact: false },
  { href: '/admin/products', label: 'Rituals', icon: Gift, exact: false },
  { href: '/admin/faqs', label: 'Sacred Questions', icon: MessagesSquare, exact: false },
  { href: '/admin/subscribers', label: 'Subscribers', icon: Users, exact: false },
  { href: '/admin/emails', label: 'Email log', icon: Mail, exact: false },
  { href: '/admin/settings', label: 'Settings', icon: Settings, exact: false },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="flex flex-col gap-1" aria-label="Admin sections">
      {NAV_ITEMS.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex min-h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors',
              active
                ? 'border-l-2 border-[#D0A56A] bg-white/10 font-medium text-[#D0A56A]'
                : 'border-l-2 border-transparent text-[#FAF6F0]/75 hover:bg-white/5 hover:text-[#FAF6F0]'
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <img src="/media/logo.svg" alt="Klub Santa crest" className="size-9 shrink-0" />
      <div className={compact ? 'hidden sm:block' : ''}>
        <p className="font-serif text-lg font-semibold leading-tight text-[#FAF6F0]">Klub Santa</p>
        <p className="text-[11px] uppercase tracking-widest text-[#D0A56A]">Sanctuary Console</p>
      </div>
    </div>
  )
}

function LogoutButton({ className }: { className?: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function handleLogout() {
    setBusy(true)
    try {
      await post('/api/admin/auth/logout')
      toast.success('Signed out. See you at the North Pole.')
      router.replace('/admin/login')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Logout failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      variant="ghost"
      onClick={handleLogout}
      disabled={busy}
      className={cn(
        'min-h-11 w-full justify-start gap-3 text-[#FAF6F0]/75 hover:bg-white/10 hover:text-[#FAF6F0]',
        className
      )}
    >
      <LogOut className="size-4" /> {busy ? 'Signing out…' : 'Sign out'}
    </Button>
  )
}

function AdminIdentity() {
  const { admin } = useAdmin()
  if (!admin) return null
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-medium text-[#3A0008]">{admin.name || admin.email}</p>
      <p className="truncate text-xs text-[#7D0A16]/60">{admin.email}</p>
    </div>
  )
}

/** Full authenticated admin shell: crimson sidebar, ivory content, mobile Sheet nav. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { admin } = useAdmin()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#FAF6F0]">
      <Toaster richColors position="top-right" />

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-gradient-to-b from-[#7D0A16] to-[#3A0008] px-4 py-6 md:flex">
        <div className="px-2">
          <Brand />
        </div>
        <Separator className="my-5 bg-[#D0A56A]/25" />
        <div className="flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        <Separator className="my-5 bg-[#D0A56A]/25" />
        <div className="flex items-center gap-3 px-2 pb-2">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[#D0A56A]/50 font-serif text-sm text-[#D0A56A]">
            {(admin?.name || admin?.email || '?').slice(0, 1).toUpperCase()}
          </div>
          <AdminIdentity />
        </div>
        {admin ? (
          <Badge
            variant="outline"
            className="mb-2 w-fit border-[#D0A56A]/50 text-[#D0A56A] capitalize"
          >
            {admin.role}
          </Badge>
        ) : null}
        <LogoutButton />
      </aside>

      {/* Topbar (mobile nav trigger + identity) */}
      <div className="md:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-[#D0A56A]/40 bg-[#FAF6F0]/90 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Open navigation"
                  className="min-h-11 min-w-11 border-[#D0A56A]/50 bg-white text-[#7D0A16] md:hidden"
                >
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-72 border-[#D0A56A]/30 bg-gradient-to-b from-[#7D0A16] to-[#3A0008] px-4 py-6 [&>button]:text-[#FAF6F0]"
              >
                <SheetHeader className="p-0 pb-4 text-left">
                  <SheetTitle asChild>
                    <div>
                      <Brand compact />
                    </div>
                  </SheetTitle>
                </SheetHeader>
                <NavLinks onNavigate={() => setMobileOpen(false)} />
                <Separator className="my-4 bg-[#D0A56A]/25" />
                <LogoutButton />
              </SheetContent>
            </Sheet>
            <span className="hidden font-serif text-sm text-[#7D0A16]/70 sm:block">
              Sanctuary Console
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <AdminIdentity />
            </div>
            {admin ? (
              <Badge
                variant="outline"
                className="hidden border-[#7D0A16]/40 bg-[#7D0A16]/5 text-[#7D0A16] capitalize sm:inline-flex"
              >
                {admin.role}
              </Badge>
            ) : null}
            <Button
              asChild
              variant="outline"
              className="min-h-9 border-[#D0A56A]/50 bg-white text-[#7D0A16] hover:bg-[#D0A56A]/10"
            >
              <a href="/" target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" /> View site
              </a>
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  )
}
