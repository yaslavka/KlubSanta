// Generates SEO assets: OG image (1200x630) + apple-icon (180x180).
// One-off script — run with: bun scripts/gen-seo-assets.ts
import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'

async function main() {
  const zai = await ZAI.create()

  // 1) OG banner (1344x768 → center-crop 1200x630 via PIL afterwards)
  console.log('Generating OG banner…')
  const og = await zai.images.generations.create({
    prompt:
      'Elegant premium Christmas social banner, warm family moment around a glowing tablet showing a video call with Santa Claus, deep crimson red background with aged gold ornamental flourishes, falling snowflakes, candlelight bokeh, luxury greeting card illustration style, no text, no letters, high quality, detailed',
    size: '1344x768',
  })
  fs.writeFileSync('/tmp/og-base.png', Buffer.from(og.data[0].base64, 'base64'))
  console.log('OG base saved:', fs.statSync('/tmp/og-base.png').size, 'bytes')

  // 2) Apple icon (1024x1024 → resize 180x180 afterwards)
  console.log('Generating apple icon…')
  const icon = await zai.images.generations.create({
    prompt:
      'App icon design: elegant Santa Claus crest emblem rendered in aged gold line art on deep crimson red background, circular heraldic badge with subtle snowflake ornaments and a small wax seal, minimalist premium style, perfectly centered, no text, no letters, high quality, detailed',
    size: '1024x1024',
  })
  fs.writeFileSync('/tmp/apple-base.png', Buffer.from(icon.data[0].base64, 'base64'))
  console.log('Apple icon base saved:', fs.statSync('/tmp/apple-base.png').size, 'bytes')
}

main().catch((e) => {
  console.error('FAILED:', e.message)
  process.exit(1)
})
