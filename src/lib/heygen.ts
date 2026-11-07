// HeyGen video generation client (real API path — activates when an API key
// is configured via the admin panel or the environment).
// Per the brief: asynchronous personalized video rendering, webhook-driven completion.
import 'server-only'
import { resolveIntegration } from '@/lib/integrations'

export type HeyGenConfig = {
  apiKey: string | null
  avatarId: string | null
  voiceId: string | null
  testMode: boolean
}

/** Reads HeyGen credentials from admin settings (DB) with env fallback. */
export async function getHeyGenConfig(): Promise<HeyGenConfig> {
  const [apiKey, avatarId, voiceId, mode] = await Promise.all([
    resolveIntegration('HEYGEN_API_KEY'),
    resolveIntegration('HEYGEN_SANTA_AVATAR_ID'),
    resolveIntegration('HEYGEN_SANTA_VOICE_ID'),
    resolveIntegration('HEYGEN_MODE'),
  ])
  return {
    apiKey: apiKey.value,
    avatarId: avatarId.value,
    voiceId: voiceId.value,
    // Test renders by default (free of video-credit charges); 'live' switches to real renders.
    testMode: (mode.value || 'test').toLowerCase() !== 'live',
  }
}

export async function isHeyGenConfigured(): Promise<boolean> {
  return Boolean((await getHeyGenConfig()).apiKey)
}

type SubmitResult = { ok: true; providerJobId: string } | { ok: false; error: string }

export async function submitHeyGenVideo(opts: {
  scriptText: string
  title: string
  bookingReference: string
}): Promise<SubmitResult> {
  const config = await getHeyGenConfig()
  if (!config.apiKey) return { ok: false, error: 'HEYGEN_API_KEY not configured' }

  if (!config.avatarId || !config.voiceId) {
    return {
      ok: false,
      error: 'HEYGEN_SANTA_AVATAR_ID / HEYGEN_SANTA_VOICE_ID not configured (asset compatibility check required by the brief)',
    }
  }

  try {
    const res = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'X-Api-Key': config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_inputs: [
          {
            character: {
              type: 'avatar',
              avatar_id: config.avatarId,
              avatar_style: 'normal',
            },
            voice: {
              type: 'text',
              input_text: opts.scriptText,
              voice_id: config.voiceId,
              speed: 1.0,
            },
            background: { type: 'color', value: '#132118' },
          },
        ],
        dimension: { width: 1280, height: 720 },
        test: config.testMode,
        caption: false,
        title: opts.title,
      }),
    })

    const data = (await res.json()) as { error?: unknown; data?: { video_id?: string } }
    if (!res.ok || !data?.data?.video_id) {
      return { ok: false, error: `HeyGen error ${res.status}: ${JSON.stringify(data).slice(0, 300)}` }
    }
    return { ok: true, providerJobId: data.data.video_id }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// Webhook payload per HeyGen docs: { event_type: "video_reservation.completed" ... } — we normalize:
export type HeyGenWebhookEvent = {
  event_type?: string
  data?: {
    video_id?: string
    status?: string
    video_url?: string
    callback_id?: string
    failed_reason?: string
  }
}
