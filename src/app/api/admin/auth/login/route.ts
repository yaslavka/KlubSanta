import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { createSessionToken, setSessionCookie, verifyPassword } from '@/lib/auth'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const schema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(6).max(200),
})

// POST /api/admin/auth/login
export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = rateLimit(`admin-login:${ip}`, 8, 60_000)
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many attempts. Try again in a minute.' }, { status: 429 })
  }

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = schema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 422 })
  }

  try {
    const user = await db.adminUser.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
    })
    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    await db.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })

    const token = await createSessionToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })
    await setSessionCookie(token)

    return NextResponse.json({
      ok: true,
      admin: { email: user.email, name: user.name, role: user.role },
    })
  } catch (e) {
    console.error('POST /api/admin/auth/login', e)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
