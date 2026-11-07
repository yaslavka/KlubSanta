'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { KeyRound, Loader2, Mail } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { post } from '@/components/admin/api'
import type { AdminUser } from '@/components/admin/types'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/admin'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await post<{ ok: boolean; admin: AdminUser }>('/api/admin/auth/login', { email, password })
      router.replace(next.startsWith('/admin') ? next : '/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
      setBusy(false)
    }
  }

  return (
    <Card className="w-full max-w-md border-[#D0A56A]/40 bg-[#FAF6F0] shadow-xl shadow-[#3A0008]/40">
      <CardHeader className="items-center text-center">
        <img src="/media/logo.svg" alt="Klub Santa crest" className="mx-auto size-16" />
        <CardTitle className="mt-2 font-serif text-xl text-[#3A0008]">
          Klub Santa — Sanctuary Access
        </CardTitle>
        <CardDescription className="text-[#7D0A16]/70">
          Sign in to tend to reservations, rituals and keepsakes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error ? (
            <Alert variant="destructive" className="border-red-300 bg-red-50 text-red-800">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-[#3A0008]">
              Email
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#D0A56A]" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@klubsanta.com"
                className="min-h-11 border-[#D0A56A]/40 bg-white pl-9 focus-visible:ring-[#7D0A16]/30"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-[#3A0008]">
              Password
            </Label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#D0A56A]" />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="min-h-11 border-[#D0A56A]/40 bg-white pl-9 focus-visible:ring-[#7D0A16]/30"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={busy}
            className="min-h-11 w-full bg-[#7D0A16] font-medium text-[#FAF6F0] hover:bg-[#5C0810]"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {busy ? 'Unlocking the workshop…' : 'Enter the sanctuary'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <p className="text-center text-xs text-[#7D0A16]/60">
          Owner credentials are seeded via ADMIN_EMAIL / ADMIN_PASSWORD.
        </p>
        <Link
          href="/"
          className="text-xs font-medium text-[#7D0A16] underline-offset-4 hover:underline"
        >
          Back to the landing page
        </Link>
      </CardFooter>
    </Card>
  )
}

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#7D0A16] to-[#3A0008] px-4 py-10">
      <Suspense
        fallback={
          <div className="font-serif text-sm tracking-wide text-[#D0A56A]">
            Preparing the sanctuary…
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  )
}
