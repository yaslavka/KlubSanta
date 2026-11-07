import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/products — active catalog for the landing page
export async function GET() {
  try {
    const products = await db.product.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json({
      products: products.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        tagline: p.tagline,
        description: p.description,
        points: p.points ? p.points.split('\n').filter(Boolean) : [],
        ribbon: p.ribbon,
        badge: p.badge,
        ctaLabel: p.ctaLabel,
        priceCents: p.priceCents,
        currency: p.currency,
        image: p.image,
        featured: p.featured,
      })),
    })
  } catch (e) {
    console.error('GET /api/products', e)
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 })
  }
}
