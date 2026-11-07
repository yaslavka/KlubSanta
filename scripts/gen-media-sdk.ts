// One-off brand media generation via z-ai-web-dev-sdk
import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'

async function main() {
  const zai = await ZAI.create()

  // 1. Hero family image (1440x704: API requires multiples of 32)
  if (!fs.existsSync('public/media/hero-family.png')) {
    console.log('Generating hero-family.png (1440x704)…')
    const img = await zai.images.generations.create({
      prompt:
        'Multigenerational family gathered around a glowing Christmas tree in a warm living room at night, grandmother father and young child by candlelight, warm cinematic photograph, deep crimson and gold Christmas color palette, candlelight glow, cozy festive atmosphere, photorealistic, high quality, no text, no watermark',
      size: '1440x704' as never,
    })
    const b64 = img.data[0]?.base64
    if (!b64) throw new Error('No image data')
    fs.writeFileSync('public/media/hero-family.png', Buffer.from(b64, 'base64'))
    console.log('OK hero-family.png')
  } else {
    console.log('SKIP hero-family.png')
  }

  // 2. Manifesto audio (wav — mp3 format unsupported by this endpoint)
  if (!fs.existsSync('public/media/manifesto.wav')) {
    console.log('Generating manifesto.wav…')
    const text =
      "In a world that moves too quickly, we believe in pausing. We believe in candlelight on winter evenings. In stories told slowly. And in the quiet wonder in a child's eyes when the phone rings, and a familiar voice speaks their name. Klub Santa is not a passing novelty. It is a living Christmas tradition, and a global sanctuary for families who choose to protect wonder, year after year. Every call is spoken by name. Every letter is sealed in crimson wax and gold. And ten percent of every ritual brings Christmas to orphans and isolated elders around the world. We don't create the magic. You do. We simply give you the key. Klub Santa. Where believers belong."
    const res = await zai.audio.tts.create({
      input: text,
      voice: 'jam',
      speed: 0.9,
      response_format: 'wav',
      stream: false,
    })
    const buf = Buffer.from(new Uint8Array(await res.arrayBuffer()))
    if (buf.length < 1000) throw new Error('Audio too small: ' + buf.length)
    fs.writeFileSync('public/media/manifesto.wav', buf)
    console.log('OK manifesto.wav', buf.length, 'bytes')
  } else {
    console.log('SKIP manifesto.wav')
  }
}

main().catch((e) => {
  console.error('FAILED:', e.message)
  process.exit(1)
})
