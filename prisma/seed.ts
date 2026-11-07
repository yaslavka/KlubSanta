// Klub Santa — database seed
// Run: bun prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

const PRODUCTS = [
  {
    slug: 'complete-keepsake-ritual',
    name: 'The Complete Keepsake Ritual',
    tagline: 'The Signature Family Gathering',
    description:
      'Our most treasured December evening: an unhurried personal call from Santa paired with a wax-sealed letter and keepsake archive.',
    points: [
      'Personalised call from Santa in your chosen language',
      'Heirloom letter bearing the gold Klub Santa seal',
      'Saved audio keepsake for future Christmases',
    ].join('\n'),
    ribbon: 'Most Cherished',
    badge: 'Call + Heirloom Keepsake',
    ctaLabel: 'Reserve Ritual',
    priceCents: 2499,
    currency: 'USD',
    image: '/media/offer-keepsake.jpg',
    featured: true,
    active: true,
    sortOrder: 1,
  },
  {
    slug: 'candlelight-call',
    name: 'The Candlelight Call From Santa',
    tagline: 'The First Spark of Belief',
    description:
      "When the phone rings and Santa speaks your child's name, the room falls quiet. A warm, personal conversation tailored by you.",
    points: [
      'Mentions their name, age, and proudest moments',
      'Scheduled for the exact evening you gather',
      'Accessible for the price of a winter coffee',
    ].join('\n'),
    ribbon: null,
    badge: '8 Languages',
    ctaLabel: 'Begin the Call',
    priceCents: 1499,
    currency: 'USD',
    image: '/media/offer-call.jpg',
    featured: false,
    active: true,
    sortOrder: 2,
  },
  {
    slug: 'wax-sealed-letter',
    name: 'Wax-Sealed Letter & Keepsake',
    tagline: 'Written in Gold & Crimson',
    description:
      "A physical & digital heirloom addressed directly to your home, accompanied by a personalised portrait of Santa's visit.",
    points: [
      'Official North Star crest & crimson wax seal',
      'Custom story celebrating their year of kindness',
      'Designed to be tucked into the family memory box',
    ].join('\n'),
    ribbon: null,
    badge: 'Tangible Proof',
    ctaLabel: 'Craft Their Letter',
    priceCents: 999,
    currency: 'USD',
    image: '/media/offer-letter.jpg',
    featured: false,
    active: true,
    sortOrder: 3,
  },
  {
    slug: 'circle-membership',
    name: 'Klub Santa Circle Membership',
    tagline: 'Where Believers Belong',
    description:
      'Step inside our year-round community of families. Enjoy our 24-day December Advent stories, priority Christmas Eve windows, and birthday notes.',
    points: [
      '24-Day December Advent Ritual for the whole home',
      'Priority Christmas Eve & Christmas Morning slots',
      'Year-over-year memory continuity for your children',
    ].join('\n'),
    ribbon: null,
    badge: 'Year-Round Sanctuary',
    ctaLabel: 'Join the Klub',
    priceCents: 4900,
    currency: 'USD',
    image: '/media/offer-membership.jpg',
    featured: false,
    active: true,
    sortOrder: 4,
  },
  {
    slug: 'gifting-token-circle',
    name: 'The Gifting Token Circle',
    tagline: 'No Believer Forgotten',
    description:
      'Gift a call from Santa to a grandparent, a friend who needs warmth, or sponsor a Christmas moment for an orphan or isolated elder.',
    points: [
      'Send a Gifting Token to any family or loved one',
      'Sponsor a call for an isolated elder or child in care',
      '10% of every ritual supports our seasonal foundation',
    ].join('\n'),
    ribbon: null,
    badge: '10% Charity Pledge',
    ctaLabel: 'Gift a Moment',
    priceCents: 1499,
    currency: 'USD',
    image: '/media/offer-gifting.jpg',
    featured: false,
    active: true,
    sortOrder: 5,
  },
  // Roadmap catalog items (inactive by default — enable from the admin panel when the channel launches)
  {
    slug: 'santa-voice-message',
    name: 'Santa Voice Message',
    tagline: 'A Keepsake In Their Pocket',
    description:
      'A downloadable Santa audio greeting in your chosen language. Sold alone or bundled with a video ritual.',
    points: [
      'Warm studio voice, personalised by name',
      'Instant private download link',
      'Bundle-friendly with any other ritual',
    ].join('\n'),
    ribbon: null,
    badge: 'Audio Keepsake',
    ctaLabel: 'Order Voice Message',
    priceCents: 399,
    currency: 'USD',
    image: '/media/pillar-keepsake.jpg',
    featured: false,
    active: false,
    sortOrder: 6,
  },
  {
    slug: 'live-santa-video-call',
    name: 'Live Santa Video Call',
    tagline: 'Face to Face With the North Pole',
    description:
      'A two-way live video conversation with a moving Santa avatar, private join link, and a purchased time limit.',
    points: [
      'Real-time conversation, microphone check included',
      'Single-use private join link',
      'Activated after end-to-end channel testing',
    ].join('\n'),
    ribbon: null,
    badge: 'Live Session',
    ctaLabel: 'Reserve Live Call',
    priceCents: 2499,
    currency: 'USD',
    image: '/media/video-poster.jpg',
    featured: false,
    active: false,
    sortOrder: 7,
  },
  {
    slug: 'call-from-santa-phone',
    name: 'Call From Santa (Phone)',
    tagline: 'The Phone Rings at Home',
    description:
      'A scheduled outbound call to a verified adult phone with timezone handling and controlled retries. Phone launch deferred until number/SIP tests pass.',
    points: [
      'Verified number & timezone scheduling',
      'Gentle reminders before the call',
      'Capped retries with agreed remedy',
    ].join('\n'),
    ribbon: null,
    badge: 'Coming Soon',
    ctaLabel: 'Join Waiting List',
    priceCents: 995,
    currency: 'USD',
    image: '/media/offer-call.jpg',
    featured: false,
    active: false,
    sortOrder: 8,
  },
]

const FAQS = [
  {
    question: 'What makes Klub Santa different from a standard Santa call?',
    answer:
      'Most seasonal calls are one-off novelties. Klub Santa is built as a multi-year family ritual and community. We remember your family story from year to year, speak in 8 languages, pair calls with tangible wax-sealed keepsakes, and dedicate 10% of our work to orphans and isolated elders.',
    sortOrder: 1,
  },
  {
    question: "How does Santa know my child's or loved one's personal details?",
    answer:
      'When you reserve your ritual, you share a few quiet notes in our ledger - their name, pronunciation, age, proudest moments from the year, and family traditions. Santa weaves those exact memories naturally into the conversation, and only the details you approve are ever used.',
    sortOrder: 2,
  },
  {
    question: 'Is Klub Santa only for young children?',
    answer:
      'Not at all. While children are at the heart of the ritual, many members gift calls and letters to older kids who are beginning to doubt, to spouses, or to grandparents and elders who cherish a warm voice on Christmas Eve.',
    sortOrder: 3,
  },
  {
    question: 'Which languages can Santa speak with our family?',
    answer:
      'Santa currently speaks with families in English, French, Spanish, German, Italian, Portuguese, Mandarin, and Cantonese, honoring each household cultural heritage.',
    sortOrder: 4,
  },
  {
    question: 'Can we keep a recording of the call for future Christmases?',
    answer:
      'Yes. Families who choose The Complete Keepsake Ritual or Klub Santa Circle Membership receive a private keepsake archive so you can replay the moment years later.',
    sortOrder: 5,
  },
  {
    question: 'How does the 10% charity mission work?',
    answer:
      'Ten percent of every seasonal ritual is dedicated to bringing Christmas gifts, letters, and warm calls to children in orphanages and isolated seniors in care homes.',
    sortOrder: 6,
  },
]

const SETTINGS: Record<string, string> = {
  contact_email: 'hello@klubsanta.com',
  pledge_percent: '10',
  brand_tagline: 'Where Believers Belong',
  checkout_mode_hint:
    'When STRIPE_SECRET_KEY is configured, reservations redirect to Stripe Checkout automatically. Until then, reservations are saved and can be marked as paid manually in the admin panel.',
}

async function main() {
  console.log('Seeding Klub Santa…')

  for (const p of PRODUCTS) {
    await db.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: p,
    })
  }
  console.log(`✓ products: ${PRODUCTS.length}`)

  const faqCount = await db.faq.count()
  if (faqCount === 0) {
    for (const f of FAQS) {
      await db.faq.create({ data: f })
    }
    console.log(`✓ faqs: ${FAQS.length}`)
  } else {
    console.log(`• faqs already present: ${faqCount}`)
  }

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@klubsanta.com').toLowerCase()
  const adminPassword = process.env.ADMIN_PASSWORD || 'KlubSanta2026!'
  const existingAdmin = await db.adminUser.findUnique({ where: { email: adminEmail } })
  if (!existingAdmin) {
    await db.adminUser.create({
      data: {
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 10),
        name: 'Owner',
        role: 'owner',
      },
    })
    console.log(`✓ admin user: ${adminEmail}`)
  } else {
    console.log(`• admin user already present: ${adminEmail}`)
  }

  for (const [key, value] of Object.entries(SETTINGS)) {
    await db.setting.upsert({ where: { key }, update: {}, create: { key, value } })
  }
  console.log(`✓ settings: ${Object.keys(SETTINGS).length}`)

  console.log('Seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
