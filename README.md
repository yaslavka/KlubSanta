# Klub Santa — Where Believers Belong 🎅

Production-grade e-commerce platform for personalised Santa rituals: reservations,
hosted checkout payments, durable AI-video fulfilment (HeyGen), transactional email
(Resend) and a full staff admin panel ("Sanctuary Console").

Brand: deep crimson `#7D0A16` · aged gold `#D0A56A` — carried through the public
site, the sandbox checkout and the admin panel.

## Stack

- **Next.js 16 (App Router) + TypeScript** — landing, API routes, webhooks
- **Prisma ORM** — portable schema (SQLite locally, **one-line switch to Supabase Postgres**)
- **Stripe Hosted Checkout** — signed webhooks + verify-on-return, **test & live modes**
- **HeyGen** — async video generation jobs (webhook-verified completion)
- **Resend** — transactional email with full delivery log
- **shadcn/ui** — admin console components

## Quick start

```bash
bun install
cp .env.example .env          # SQLite path works out of the box
bun run db:push               # create/update the database
bun run seed                  # demo catalog, FAQs, admin accounts
bun run dev                   # http://localhost:3000
```

Admin panel: `/admin` → login with a seeded owner account (see seed output) —
**change the password immediately**.

## Payment modes (test → battle, env-only switch)

The whole payment layer is **wired from day one**. Three modes, switched purely
by environment variables — no code changes:

| Mode | When | How to test |
|---|---|---|
| **Sandbox** (default) | `STRIPE_SECRET_KEY` unset | Reserve a ritual → built-in branded checkout `/checkout/sandbox` opens. `4242 4242 4242 4242` succeeds, `4000 0000 0000 0002` declines. |
| **Stripe TEST** | `STRIPE_SECRET_KEY=sk_test_…` | Real Stripe hosted checkout on the test network. Use Stripe test cards (same `4242…`). |
| **Stripe LIVE** | `STRIPE_SECRET_KEY=sk_live_…` | Battle mode. Real charges. Verify the live webhook secret first. |

The active mode is always visible in the admin panel (sidebar badge + Settings →
"Active payment mode" card with a go-live checklist). Credentials can be pasted
directly in the admin panel — **API & AI Providers** (`/admin/api-docs`) — stored
server-side and masked in every response; environment variables act as fallback
(admin-panel values win). Editing integration credentials is restricted to the
`owner` role.

### How a payment is fulfilled (identical in all modes)

```
reservation → hosted checkout → signed webhook (or verify-on-return)
    → markOrderPaid (idempotent) → confirmation email
    → durable GenerationJob → HeyGen dispatch (idempotent)
    → webhook-verified completion → keepsake email with private download link (JWT, 30d)
```

### Stripe webhook (production)

- Endpoint URL: `https://YOUR-DOMAIN/api/webhooks/stripe`
- Events: `checkout.session.completed`, `checkout.session.expired`,
  `checkout.session.async_payment_failed`, `charge.refunded`
- Signature verification is mandatory and already implemented; unhandled events
  are acknowledged fast (dispatcher pattern).

Local TEST mode without a public webhook URL still completes the pipeline:
the success page verifies the session via `POST /api/checkout/confirm`
(idempotent with the webhook — whoever arrives first wins, never double-fulfils).

## Admin panel (Sanctuary Console)

`/admin` — role-based staff accounts (`owner`, `support`, `finance`, `content`):

- **Dashboard** — live counters (reservations, paid orders, jobs, subscribers)
- **Reservations** — personalisation details, notes, status workflow
- **Orders** — payment status, mark-as-paid (manual/bank), refunds tracking
- **Generation jobs** — queue, retry, provider job ids, outputs
- **Rituals (catalog)** — products, prices, ordering, active toggles
- **Sacred Questions** — FAQ management rendered on the landing page
- **Subscribers** — "North Pole Dispatch" newsletter list
- **Email log** — every outbound message with provider status
- **API & AI Providers** (`/admin/api-docs`) — full API reference (storefront,
  webhooks, admin) + paste-in credentials for the AI video provider (HeyGen:
  API key, Santa Avatar ID, Voice ID, webhook secret, render mode), Stripe and
  Resend — with "where to get each value" hints and webhook URLs to register
- **Settings** — key/value site settings + payment mode & go-live checklist

## Migrating to Supabase Postgres (per technical brief)

The Prisma schema uses only portable scalar types — no model changes needed:

1. `provider = "postgresql"` in `prisma/schema.prisma`
2. `DATABASE_URL="postgresql://…supabase.co:5432/postgres"`
3. `bun run db:push`

## Security notes

- All provider credentials are server-only (`server-only` modules, never shipped to the client)
- Sandbox payment tokens are HMAC-signed (SESSION_SECRET), amount-bound and expire in 24h
- Rate limiting on all public write endpoints
- Adult consent is required and stored with every reservation (child-safety posture)
- Keepsake download links are signed JWTs with expiry, not public URLs

## Project structure

```
src/app/                 landing (/), sandbox checkout, admin (/admin), API routes
src/app/api/checkout/    hosted-checkout entry, sandbox gateway, verify-on-return
src/app/api/webhooks/    stripe (signed), heygen (signed)
src/lib/                 payments, fulfillment pipeline, mailer, heygen, auth, db
src/components/landing/  the 12-section Klub Santa landing experience
src/components/admin/    Sanctuary Console shell + page building blocks
prisma/schema.prisma     portable data model (Postgres-ready)
```
