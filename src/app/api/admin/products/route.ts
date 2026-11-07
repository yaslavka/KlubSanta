import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const productSchema = z.object({
  slug: z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and dashes only'),
  name: z.string().trim().min(2).max(120),
  tagline: z.string().trim().max(160).default(''),
  description: z.string().trim().max(1000).default(''),
  points: z.string().max(2000).default(''),
  ribbon: z.string().trim().max(60).nullable().optional(),
  badge: z.string().trim().max(60).nullable().optional(),
  ctaLabel: z.string().trim().max(60).default('Reserve Ritual'),
  priceCents: z.number().int().min(0).max(10_000_00),
  currency: z.string().trim().length(3).default('USD'),
  image: z.string().trim().max(300).nullable().optional(),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(999).default(0),
})

// GET /api/admin/products — all products (incl. inactive)
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const products = await db.product.findMany({ orderBy: { sortOrder: 'asc' } })
    return NextResponse.json({ products })
  } catch (e) {
    console.error('GET /api/admin/products', e)
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 })
  }
}

// POST /api/admin/products
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = productSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Validation failed' }, { status: 422 })
  }

  try {
    const exists = await db.product.findUnique({ where: { slug: parsed.data.slug } })
    if (exists) return NextResponse.json({ error: 'A product with this slug already exists' }, { status: 409 })

    const product = await db.product.create({
      data: {
        ...parsed.data,
        ribbon: parsed.data.ribbon || null,
        badge: parsed.data.badge || null,
        image: parsed.data.image || null,
      },
    })
    return NextResponse.json({ product }, { status: 201 })
  } catch (e) {
    console.error('POST /api/admin/products', e)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}
