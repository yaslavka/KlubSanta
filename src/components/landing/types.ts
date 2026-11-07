export type LandingProduct = {
  id: string
  slug: string
  name: string
  tagline: string
  description: string
  points: string[]
  ribbon: string | null
  badge: string | null
  ctaLabel: string
  priceCents: number
  currency: string
  image: string | null
  featured: boolean
}

export type LandingFaq = {
  id: string
  question: string
  answer: string
  sortOrder: number
}
