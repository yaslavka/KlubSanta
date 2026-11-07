'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck,
  BookOpen,
  Braces,
  Clapperboard,
  Copy,
  CreditCard,
  FlaskConical,
  KeyRound,
  Loader2,
  Mail,
  Save,
  Webhook,
} from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { get, put } from '@/components/admin/api'
import { useAdmin } from '@/components/admin/admin-provider'
import { PageHeader } from '@/components/admin/page-header'

type IntegrationItem = {
  key: string
  configured: boolean
  source: 'db' | 'env' | 'none'
  masked: string | null
}

type IntegrationsResponse = {
  integrations: IntegrationItem[]
  payments: { mode: 'stripe_live' | 'stripe_test' | 'sandbox'; stripeConfigured: boolean; webhookConfigured: boolean }
  providers: { heygen: boolean; stripe: boolean; resend: boolean }
}

// ---------------------------------------------------------------------------
// API reference data — the living documentation of this platform's API.
// ---------------------------------------------------------------------------

type Endpoint = {
  method: string
  path: string
  auth: string
  description: string
  request?: string
  response?: string
}

const PUBLIC_ENDPOINTS: Endpoint[] = [
  {
    method: 'POST',
    path: '/api/bookings',
    auth: 'Public (rate-limited)',
    description: 'Create a ritual reservation from the personalisation modal. Stores only parent-approved details + explicit adult consent.',
    request: '{ productSlug, recipientName, pronunciation?, ageRange?, language, parentEmail, memoryNote?, consentGiven: true }',
    response: '201 { booking: { id, reference "KS-XXXXXX", status, planName }, amountCents, currency }',
  },
  {
    method: 'POST',
    path: '/api/checkout',
    auth: 'Public (rate-limited)',
    description: 'Start a hosted checkout for a reservation. Returns the hosted URL (Stripe test/live) or the sandbox checkout URL.',
    request: '{ bookingId }',
    response: '{ url, mode: "stripe_live" | "stripe_test" | "sandbox" }',
  },
  {
    method: 'POST',
    path: '/api/checkout/confirm',
    auth: 'Public (rate-limited)',
    description: 'Verify-on-return for Stripe: retrieves the Checkout Session from Stripe and fulfils idempotently when truly paid.',
    request: '{ sessionId }',
    response: '{ ok, alreadyPaid? }',
  },
  {
    method: 'POST',
    path: '/api/checkout/sandbox',
    auth: 'HMAC token from /api/checkout',
    description: 'Sandbox gateway payment step — same markOrderPaid pipeline as the Stripe webhook. 4242… succeeds, 4000…0002 declines.',
    request: '{ token, card: { number, name, expiry "MM/YY", cvc } }',
    response: '{ ok, redirect } · 402 { code: "card_declined" }',
  },
  {
    method: 'GET',
    path: '/api/download/{token}',
    auth: 'Signed JWT (30 days, in email)',
    description: 'Private keepsake download link issued after verified video completion. Not a public URL.',
    response: 'video/mp4 stream',
  },
  {
    method: 'GET',
    path: '/api/products · /api/faq',
    auth: 'Public',
    description: 'Active catalog and Sacred Questions rendered on the landing page (managed in the admin panel).',
    response: '{ products | faqs }',
  },
  {
    method: 'POST',
    path: '/api/newsletter',
    auth: 'Public (rate-limited)',
    description: 'Subscribe an email to the "North Pole Dispatch".',
    request: '{ email }',
    response: '201 { ok }',
  },
]

const WEBHOOK_ENDPOINTS: Endpoint[] = [
  {
    method: 'POST',
    path: '/api/webhooks/stripe',
    auth: 'Stripe signature (STRIPE_WEBHOOK_SECRET)',
    description: 'Payment source of truth. Idempotent — webhook and confirm-on-return never double-fulfil.',
    request: 'Stripe events: checkout.session.completed · checkout.session.expired · checkout.session.async_payment_failed · charge.refunded',
    response: '{ received: true } (fast ack, work continues in durable job)',
  },
  {
    method: 'POST',
    path: '/api/webhooks/heygen',
    auth: 'Shared secret header x-heygen-secret (HEYGEN_WEBHOOK_SECRET)',
    description: 'AI video completion callbacks. Verified completion → keepsake email with private download link.',
    request: '{ event_type, data: { video_id, status, video_url?, failed_reason? } }',
    response: '{ received: true }',
  },
  {
    method: 'PUT',
    path: '/api/webhooks/heygen',
    auth: 'Admin session',
    description: 'Re-dispatch a failed/queued generation job to HeyGen (retry-safe).',
    request: '{ jobId }',
    response: '{ ok }',
  },
]

const ADMIN_ENDPOINTS: Endpoint[] = [
  { method: 'POST', path: '/api/admin/auth/login · logout · GET me', auth: 'Session cookie', description: 'Staff authentication (bcrypt + JWT, 7 days).' },
  { method: 'GET', path: '/api/admin/stats', auth: 'Admin session', description: 'Dashboard counters.' },
  { method: 'GET·POST·PATCH', path: '/api/admin/bookings · /{id}', auth: 'Admin session', description: 'Reservations: list, create, update status/notes.' },
  { method: 'GET·POST·PATCH', path: '/api/admin/orders · /{id}', auth: 'Admin session', description: 'Orders: list, mark paid (manual/bank), refund tracking.' },
  { method: 'GET·PATCH', path: '/api/admin/jobs · /{id}', auth: 'Admin session', description: 'Generation jobs: queue state, retry, outputs.' },
  { method: 'GET·POST·PATCH', path: '/api/admin/products · /{id}', auth: 'Admin session', description: 'Ritual catalog management (prices, ordering, active).' },
  { method: 'GET·POST·PATCH', path: '/api/admin/faqs · /{id}', auth: 'Admin session', description: 'Sacred Questions (landing FAQ).' },
  { method: 'GET', path: '/api/admin/subscribers · /api/admin/emails', auth: 'Admin session', description: 'Newsletter list and outbound email log.' },
  { method: 'GET·PUT', path: '/api/admin/settings', auth: 'Admin session · secrets: owner only', description: 'Site settings. Integration keys are masked in responses.' },
  { method: 'GET', path: '/api/admin/integrations', auth: 'Admin session', description: 'Provider status + masked integration values (this page).' },
]

// ---------------------------------------------------------------------------
// Provider field definitions (what the client pastes where).
// ---------------------------------------------------------------------------

type FieldDef = {
  key: string
  label: string
  placeholder: string
  hint: string
  secret?: boolean
}

const HEYGEN_FIELDS: FieldDef[] = [
  { key: 'HEYGEN_API_KEY', label: 'HeyGen API key', placeholder: 'e.g. ZTlkNWEzN...', secret: true, hint: 'app.heygen.com → your profile → Settings → API → "Create API token". This is the key that authorises video generation requests.' },
  { key: 'HEYGEN_SANTA_AVATAR_ID', label: 'Santa Avatar ID (avatar_id)', placeholder: 'e.g. Santa_Claus_Video or 1b3b0c...', hint: 'HeyGen → Avatars → pick your Santa avatar (Avatar III/IV) → copy "avatar_id" from the avatar details / API snippet.' },
  { key: 'HEYGEN_SANTA_VOICE_ID', label: 'Santa Voice ID (voice_id)', placeholder: 'e.g. 1bd001e0e0f94b02ba058...', hint: 'HeyGen → Voice / the chosen avatar\'s voice → copy "voice_id". Controls the language & timbre of the personalised script.' },
  { key: 'HEYGEN_WEBHOOK_SECRET', label: 'Webhook shared secret (x-heygen-secret)', placeholder: 'any long random string', secret: true, hint: 'You invent this value: paste the same string into HeyGen → Settings → Webhooks → your endpoint\'s secret field. Protects /api/webhooks/heygen from forgeries.' },
]

const STRIPE_FIELDS: FieldDef[] = [
  { key: 'STRIPE_SECRET_KEY', label: 'Stripe secret key', placeholder: 'sk_test_… (test) · sk_live_… (battle)', secret: true, hint: 'dashboard.stripe.com → Developers → API keys → "Secret key". sk_test_ = test payments, sk_live_ = real charges. Mode switches automatically.' },
  { key: 'STRIPE_WEBHOOK_SECRET', label: 'Stripe webhook signing secret', placeholder: 'whsec_…', secret: true, hint: 'Register the webhook below → Stripe shows "Signing secret" → paste it here. Required control per the technical brief.' },
]

const RESEND_FIELDS: FieldDef[] = [
  { key: 'RESEND_API_KEY', label: 'Resend API key', placeholder: 're_...', secret: true, hint: 'resend.com → API Keys → "Create API Key". Sends booking confirmations, payment receipts and keepsake-ready letters.' },
  { key: 'EMAIL_FROM', label: 'From address', placeholder: 'Klub Santa <letters@klubsanta.com>', hint: 'Must be a domain verified in Resend → Domains.' },
]

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="min-h-8 shrink-0 border-[#D0A56A]/50 bg-white px-2 text-[#7D0A16] hover:bg-[#D0A56A]/10"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          toast.error('Clipboard unavailable')
        }
      }}
      aria-label={`Copy ${value}`}
    >
      {copied ? <BadgeCheck className="size-3.5" /> : <Copy className="size-3.5" />}
    </Button>
  )
}

function EndpointTable({ endpoints }: { endpoints: Endpoint[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-[#D0A56A]/30">
            <TableHead className="w-40 text-[#7D0A16]/70">Method · Path</TableHead>
            <TableHead className="w-44 text-[#7D0A16]/70">Auth</TableHead>
            <TableHead className="text-[#7D0A16]/70">Description · payload</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {endpoints.map((e) => (
            <TableRow key={e.path + e.method} className="border-[#D0A56A]/20 align-top hover:bg-[#7D0A16]/[0.03]">
              <TableCell>
                <div className="space-y-1">
                  <Badge variant="outline" className="border-[#7D0A16]/30 bg-[#7D0A16]/5 font-mono text-[10px] text-[#7D0A16]">
                    {e.method}
                  </Badge>
                  <p className="break-all font-mono text-xs font-semibold text-[#3A0008]">{e.path}</p>
                </div>
              </TableCell>
              <TableCell className="text-xs text-[#3A0008]/70">{e.auth}</TableCell>
              <TableCell className="text-sm text-[#3A0008]/80">
                {e.description}
                {e.request ? (
                  <p className="mt-1 break-all font-mono text-[11px] text-[#7D0A16]/70">→ in: {e.request}</p>
                ) : null}
                {e.response ? (
                  <p className="mt-0.5 break-all font-mono text-[11px] text-[#7D0A16]/70">← out: {e.response}</p>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function ProviderForm({
  fields,
  integrations,
  onSave,
  saving,
}: {
  fields: FieldDef[]
  integrations: Map<string, IntegrationItem>
  onSave: (values: Record<string, string>) => Promise<void>
  saving: boolean
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  return (
    <div className="space-y-4">
      {fields.map((field) => {
        const current = integrations.get(field.key)
        return (
          <div key={field.key} className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor={`int-${field.key}`} className="font-mono text-xs font-semibold text-[#7D0A16]">
                {field.key}
              </Label>
              {current ? (
                <span className="flex items-center gap-1.5 text-[11px] text-[#3A0008]/60">
                  {current.configured ? (
                    <>
                      <BadgeCheck className="size-3.5 text-emerald-600" />
                      set via {current.source === 'db' ? 'admin panel' : 'environment'} · {current.masked}
                    </>
                  ) : (
                    <span className="text-amber-700">not set</span>
                  )}
                </span>
              ) : null}
            </div>
            <Input
              id={`int-${field.key}`}
              type={field.secret ? 'password' : 'text'}
              autoComplete="off"
              placeholder={current?.configured ? '•••••••• (leave empty to keep current)' : field.placeholder}
              value={drafts[field.key] ?? ''}
              onChange={(e) => setDrafts((prev) => ({ ...prev, [field.key]: e.target.value }))}
              className="min-h-11 border-[#D0A56A]/40 bg-white font-mono text-sm"
            />
            <p className="text-xs leading-relaxed text-[#3A0008]/60">{field.hint}</p>
          </div>
        )
      })}
      <Button
        type="button"
        disabled={saving || Object.values(drafts).every((v) => !v.trim())}
        onClick={async () => {
          await onSave(
            Object.fromEntries(Object.entries(drafts).filter(([, v]) => v.trim().length > 0))
          )
          setDrafts({})
        }}
        className="min-h-11 bg-[#7D0A16] text-[#FAF6F0] hover:bg-[#5C0810] disabled:opacity-50"
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        Save credentials
      </Button>
    </div>
  )
}

function StatusChip({ ok, label, pending }: { ok: boolean; label: string; pending: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
        ok
          ? 'border-emerald-600/40 bg-emerald-600/10 text-emerald-800'
          : 'border-amber-500/50 bg-amber-500/10 text-amber-700'
      }`}
    >
      <span className={`size-1.5 rounded-full ${ok ? 'bg-emerald-600' : 'bg-amber-500'}`} />
      {ok ? label : pending}
    </span>
  )
}

export default function AdminApiDocsPage() {
  const { admin, refresh } = useAdmin()
  const [data, setData] = useState<IntegrationsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingProvider, setSavingProvider] = useState<string | null>(null)
  const isOwner = admin?.role === 'owner'

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await get<IntegrationsResponse>('/api/admin/integrations')
      setData(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load integrations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const integrationMap = useMemo(
    () => new Map((data?.integrations ?? []).map((i) => [i.key, i])),
    [data]
  )

  async function saveProvider(provider: string, values: Record<string, string>) {
    if (Object.keys(values).length === 0) return
    setSavingProvider(provider)
    try {
      await put('/api/admin/settings', { settings: values })
      toast.success(`${provider} credentials saved — active immediately.`)
      await load()
      refresh() // re-sync payment mode badge after Stripe key changes
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSavingProvider(null)
    }
  }

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain'

  return (
    <div>
      <PageHeader
        title="API & AI Providers"
        subtitle="Where the platform's API lives, and where you paste the credentials for the AI services that generate your videos, payments and email."
      />

      {/* Provider status at a glance */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <StatusChip
          ok={Boolean(data?.payments.stripeConfigured)}
          label={data?.payments.mode === 'stripe_live' ? 'Stripe · LIVE' : data?.payments.mode === 'stripe_test' ? 'Stripe · TEST' : ''}
          pending="Payments: sandbox gateway"
        />
        <StatusChip ok={Boolean(data?.providers.heygen)} label="HeyGen AI · active" pending="HeyGen AI · awaiting data" />
        <StatusChip ok={Boolean(data?.providers.resend)} label="Resend email · active" pending="Resend email · awaiting key" />
        {loading ? <Loader2 className="size-4 animate-spin text-[#7D0A16]/50" /> : null}
      </div>

      {error ? (
        <Alert variant="destructive" className="mb-6 border-red-300 bg-red-50 text-red-800">
          <AlertTitle>Failed to load</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Tabs defaultValue="heygen">
        <TabsList className="mb-4 flex-wrap border-[#D0A56A]/40 bg-white">
          <TabsTrigger value="heygen" className="gap-1.5">
            <Clapperboard className="size-4" /> AI Video (HeyGen)
          </TabsTrigger>
          <TabsTrigger value="stripe" className="gap-1.5">
            <CreditCard className="size-4" /> Payments (Stripe)
          </TabsTrigger>
          <TabsTrigger value="resend" className="gap-1.5">
            <Mail className="size-4" /> Email (Resend)
          </TabsTrigger>
          <TabsTrigger value="reference" className="gap-1.5">
            <BookOpen className="size-4" /> API Reference
          </TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------ AI VIDEO (HeyGen) */}
        <TabsContent value="heygen">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
            <Card className="border-[#D0A56A]/40 bg-white">
              <CardContent className="p-4 md:p-6">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-full bg-[#7D0A16]/10">
                    <KeyRound className="size-4 text-[#7D0A16]" />
                  </div>
                  <div>
                    <h2 className="font-serif text-lg font-semibold text-[#7D0A16]">
                      Data for your AI video generator
                    </h2>
                    <p className="text-xs text-[#3A0008]/60">
                      Paste once — every paid reservation is dispatched to HeyGen automatically.
                    </p>
                  </div>
                </div>

                {isOwner ? (
                  <ProviderForm
                    fields={HEYGEN_FIELDS}
                    integrations={integrationMap}
                    onSave={(values) => saveProvider('HeyGen', values)}
                    saving={savingProvider === 'HeyGen'}
                  />
                ) : (
                  <Alert className="border-[#D0A56A]/50 bg-[#D0A56A]/10 text-[#3A0008]">
                    <AlertTitle className="font-serif text-[#7D0A16]">Owner access required</AlertTitle>
                    <AlertDescription className="text-[#3A0008]/80">
                      Your role ({admin?.role}) can view status but not change provider credentials.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="border-[#D0A56A]/40 bg-white">
                <CardContent className="p-4 md:p-6">
                  <h3 className="mb-3 flex items-center gap-2 font-serif text-base font-semibold text-[#7D0A16]">
                    <Webhook className="size-4" /> Register the completion webhook
                  </h3>
                  <div className="flex items-center gap-2 rounded-md border border-[#D0A56A]/40 bg-[#7D0A16]/[0.03] px-3 py-2">
                    <code className="min-w-0 flex-1 break-all font-mono text-xs text-[#3A0008]">
                      {appUrl}/api/webhooks/heygen
                    </code>
                    <CopyButton value={`${appUrl}/api/webhooks/heygen`} />
                  </div>
                  <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-[#3A0008]/80">
                    <li>HeyGen → Settings → Webhooks → “Add endpoint”.</li>
                    <li>Paste the URL above, choose video success/failure events.</li>
                    <li>Put the same secret you saved in the form (field <code className="font-mono text-xs">HEYGEN_WEBHOOK_SECRET</code>) into the endpoint’s secret field.</li>
                  </ol>
                </CardContent>
              </Card>

              <Card className="border-[#D0A56A]/40 bg-white">
                <CardContent className="p-4 md:p-6">
                  <h3 className="mb-3 flex items-center gap-2 font-serif text-base font-semibold text-[#7D0A16]">
                    <FlaskConical className="size-4" /> Render mode
                  </h3>
                  <p className="mb-3 text-sm text-[#3A0008]/70">
                    Test renders validate the whole pipeline without consuming video credits.
                    Switch to live when you are ready for real keepsakes.
                  </p>
                  {isOwner ? (
                    <div className="flex items-center gap-3">
                      <Select
                        value={integrationMap.get('HEYGEN_MODE')?.configured ? 'live' : 'test'}
                        onValueChange={(v) => void saveProvider('HeyGen mode', { HEYGEN_MODE: v })}
                        disabled={savingProvider === 'HeyGen mode'}
                      >
                        <SelectTrigger className="min-h-11 w-56 border-[#D0A56A]/40 bg-white">
                          <SelectValue placeholder="Render mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="test">Test renders (default)</SelectItem>
                          <SelectItem value="live">Live renders (billed)</SelectItem>
                        </SelectContent>
                      </Select>
                      {savingProvider === 'HeyGen mode' ? (
                        <Loader2 className="size-4 animate-spin text-[#7D0A16]" />
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm text-[#3A0008]/60">
                      Current mode: <strong>{integrationMap.get('HEYGEN_MODE')?.configured ? 'live' : 'test'}</strong>
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-[#D0A56A]/40 bg-white">
                <CardContent className="p-4 md:p-6">
                  <h3 className="mb-3 font-serif text-base font-semibold text-[#7D0A16]">
                    How the AI pipeline uses this data
                  </h3>
                  <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-[#3A0008]/80">
                    <li>Parent reserves a ritual → personalisation saved (name, language, proud moment).</li>
                    <li>Payment confirmed → durable generation job is queued with the auto-written Santa script.</li>
                    <li>Job dispatches to HeyGen <code className="font-mono text-xs">/v2/video/generate</code> using the Avatar&nbsp;+&nbsp;Voice IDs above (idempotent, retry-safe).</li>
                    <li>HeyGen calls the webhook → job completed → parent receives the private download link by email.</li>
                  </ol>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ------------------------------------------------------- PAYMENTS */}
        <TabsContent value="stripe">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
            <Card className="border-[#D0A56A]/40 bg-white">
              <CardContent className="p-4 md:p-6">
                <h2 className="mb-1 font-serif text-lg font-semibold text-[#7D0A16]">Stripe credentials</h2>
                <p className="mb-4 text-xs text-[#3A0008]/60">
                  sk_test_… enables test payments; replacing it with sk_live_… switches to battle mode — nothing else changes.
                </p>
                {isOwner ? (
                  <ProviderForm
                    fields={STRIPE_FIELDS}
                    integrations={integrationMap}
                    onSave={(values) => saveProvider('Stripe', values)}
                    saving={savingProvider === 'Stripe'}
                  />
                ) : (
                  <Alert className="border-[#D0A56A]/50 bg-[#D0A56A]/10 text-[#3A0008]">
                    <AlertTitle className="font-serif text-[#7D0A16]">Owner access required</AlertTitle>
                    <AlertDescription className="text-[#3A0008]/80">
                      Your role ({admin?.role}) can view status but not change payment credentials.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card className="border-[#D0A56A]/40 bg-white">
              <CardContent className="p-4 md:p-6">
                <h3 className="mb-3 flex items-center gap-2 font-serif text-base font-semibold text-[#7D0A16]">
                  <Webhook className="size-4" /> Register the payment webhook
                </h3>
                <div className="flex items-center gap-2 rounded-md border border-[#D0A56A]/40 bg-[#7D0A16]/[0.03] px-3 py-2">
                  <code className="min-w-0 flex-1 break-all font-mono text-xs text-[#3A0008]">
                    {appUrl}/api/webhooks/stripe
                  </code>
                  <CopyButton value={`${appUrl}/api/webhooks/stripe`} />
                </div>
                <p className="mt-3 text-sm text-[#3A0008]/80">
                  dashboard.stripe.com → Developers → Webhooks → “Add endpoint”, subscribe to:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-[#3A0008]/80">
                  <li>· <code className="font-mono text-xs">checkout.session.completed</code></li>
                  <li>· <code className="font-mono text-xs">checkout.session.expired</code></li>
                  <li>· <code className="font-mono text-xs">checkout.session.async_payment_failed</code></li>
                  <li>· <code className="font-mono text-xs">charge.refunded</code></li>
                </ul>
                <Separator className="my-4 bg-[#D0A56A]/30" />
                <p className="text-xs leading-relaxed text-[#3A0008]/60">
                  Signatures are always verified before an order is marked paid. Even without a
                  reachable webhook (local tests), payments still fulfil on return via
                  <code className="mx-1 font-mono text-[11px]">/api/checkout/confirm</code>— both paths are idempotent.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ---------------------------------------------------------- EMAIL */}
        <TabsContent value="resend">
          <Card className="border-[#D0A56A]/40 bg-white lg:w-1/2">
            <CardContent className="p-4 md:p-6">
              <h2 className="mb-1 font-serif text-lg font-semibold text-[#7D0A16]">Resend email credentials</h2>
              <p className="mb-4 text-xs text-[#3A0008]/60">
                Without a key every letter is still composed and logged (Email log page) with status “skipped_no_provider”.
              </p>
              {isOwner ? (
                <ProviderForm
                  fields={RESEND_FIELDS}
                  integrations={integrationMap}
                  onSave={(values) => saveProvider('Resend', values)}
                  saving={savingProvider === 'Resend'}
                />
              ) : (
                <Alert className="border-[#D0A56A]/50 bg-[#D0A56A]/10 text-[#3A0008]">
                  <AlertTitle className="font-serif text-[#7D0A16]">Owner access required</AlertTitle>
                  <AlertDescription className="text-[#3A0008]/80">
                    Your role ({admin?.role}) can view status but not change provider credentials.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* -------------------------------------------------- API REFERENCE */}
        <TabsContent value="reference">
          <div className="space-y-4">
            <Card className="border-[#D0A56A]/40 bg-white">
              <CardContent className="p-4 md:p-6">
                <h2 className="mb-1 flex items-center gap-2 font-serif text-lg font-semibold text-[#7D0A16]">
                  <Braces className="size-5" /> Storefront API
                </h2>
                <p className="mb-4 text-sm text-[#3A0008]/60">
                  Public endpoints powering the landing page, personalisation and checkout.
                </p>
                <EndpointTable endpoints={PUBLIC_ENDPOINTS} />
              </CardContent>
            </Card>

            <Card className="border-[#D0A56A]/40 bg-white">
              <CardContent className="p-4 md:p-6">
                <h2 className="mb-1 flex items-center gap-2 font-serif text-lg font-semibold text-[#7D0A16]">
                  <Webhook className="size-5" /> Webhooks (provider callbacks)
                </h2>
                <p className="mb-4 text-sm text-[#3A0008]/60">
                  Every webhook acknowledges fast and continues work in a durable job — per the
                  technical brief. All handlers are idempotent and signature-checked.
                </p>
                <EndpointTable endpoints={WEBHOOK_ENDPOINTS} />
              </CardContent>
            </Card>

            <Card className="border-[#D0A56A]/40 bg-white">
              <CardContent className="p-4 md:p-6">
                <h2 className="mb-1 font-serif text-lg font-semibold text-[#7D0A16]">Admin API</h2>
                <p className="mb-4 text-sm text-[#3A0008]/60">
                  Used by this console — session-cookie authenticated, role-scoped.
                </p>
                <EndpointTable endpoints={ADMIN_ENDPOINTS} />
              </CardContent>
            </Card>

            <Card className="border-[#D0A56A]/40 bg-white">
              <CardContent className="p-4 md:p-6">
                <h2 className="mb-3 font-serif text-lg font-semibold text-[#7D0A16]">End-to-end example</h2>
                <pre className="overflow-x-auto rounded-md border border-[#D0A56A]/40 bg-[#3A0008] p-4 font-mono text-xs leading-relaxed text-[#FAF6F0]">
{`# 1. Create a reservation
curl -X POST ${appUrl}/api/bookings -H 'Content-Type: application/json' -d '{
  "productSlug": "complete-keepsake-ritual",
  "recipientName": "Mira", "language": "English",
  "parentEmail": "parent@example.com", "consentGiven": true }'
# → { booking: { id, reference "KS-…" }, amountCents: 2499 }

# 2. Start hosted checkout
curl -X POST ${appUrl}/api/checkout -H 'Content-Type: application/json' \\
  -d '{ "bookingId": "<booking.id>" }'
# → { url: "https://checkout.stripe.com/…", mode: "stripe_test" }

# 3. Payment confirmed (webhook or verify-on-return) → order paid →
#    generation job → HeyGen render → webhook completion →
#    keepsake email with GET /api/download/{signed-jwt}`}
                </pre>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
