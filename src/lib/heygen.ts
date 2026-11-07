// HeyGen video generation client (real API path — activates when HEYGEN_API_KEY is set).
// Per the brief: asynchronous personalized video rendering, webhook-driven completion.
import 'server-only'

export function isHeyGenConfigured(): boolean {
  return Boolean(process.env.HEYGEN_API_KEY)
}

type SubmitResult = { ok: true; providerJobId: string } | { ok: false; error: string }

export async function submitHeyGenVideo(opts: {
  scriptText: string
  title: string
  bookingReference: string
}): Promise<SubmitResult> {
  const apiKey = process.env.HEYGEN_API_KEY
  if (!apiKey) return { ok: false, error: 'HEYGEN_API_KEY not configured' }

  const avatarId = process.env.HEYGEN_SANTA_AVATAR_ID
  const voiceId = process.env.HEYGEN_SANTA_VOICE_ID
  if (!avatarId || !voiceId) {
    return {
      ok: false,
      error: 'HEYGEN_SANTA_AVATAR_ID / HEYGEN_SANTA_VOICE_ID not configured (asset compatibility check required by the brief)',
    }
  }

  try {
    const res = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_inputs: [
          {
            character: {
              type: 'avatar',
              avatar_id: avatarId,
              avatar_style: 'normal',
            },
            voice: {
              type: 'text',
              input_text: opts.scriptText,
              voice_id: voiceId,
              speed: 1.0,
            },
            background: { type: 'color', value: '#132118' },
          },
        ],
        dimension: { width: 1280, height: 720 },
        test: process.env.HEYGEN_MODE === 'live' ? false : true,
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
