// Protects /admin/* pages and /api/admin/* endpoints (except the login route).
// JWT verification runs on the edge via jose.
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const ADMIN_COOKIE = 'ks_admin_session'

function getSecret(): Uint8Array {
  const secret =
    process.env.SESSION_SECRET || 'klub-santa-dev-secret-change-me-in-production-0123456789'
  return new TextEncoder().encode(secret)
}

async function isValidSession(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(ADMIN_COOKIE)?.value
  if (!token) return false
  try {
    await jwtVerify(token, getSecret())
    return true
  } catch {
    return false
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Login route stays public
  if (pathname === '/admin/login' || pathname === '/api/admin/auth/login') {
    return NextResponse.next()
  }

  const ok = await isValidSession(req)

  if (pathname.startsWith('/api/admin')) {
    if (!ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  if (!ok) {
    const loginUrl = new URL('/admin/login', req.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
