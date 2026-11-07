#!/bin/bash
# Klub Santa — brand media generation (images via z-ai CLI, audio via z-ai TTS CLI)
cd /home/z/my-project
mkdir -p public/media
S="warm cinematic photograph, deep crimson and gold Christmas color palette, candlelight glow, cozy festive atmosphere, photorealistic, high quality, no text, no watermark"

gen() {
  local out="$1"; local size="$2"; local prompt="$3"
  if [ -s "public/media/$out" ]; then echo "SKIP $out (exists)"; return; fi
  for i in 1 2 3; do
    echo "[$(date +%H:%M:%S)] gen $out attempt $i"
    z-ai image -p "$prompt" -o "public/media/$out" -s "$size" && [ -s "public/media/$out" ] && { echo "OK $out"; return; }
    sleep 3
  done
  echo "FAIL $out"
}

gen "hero-family.png" "1440x720" "Multigenerational family gathered around a glowing Christmas tree in a warm living room at night, grandmother father and young child by candlelight, $S"
gen "about-santa.jpg" "864x1152" "Kind classic Santa Claus with white beard reading a large golden ledger book in a candlelit wooden study, deep crimson velvet suit with gold trim, warm fireplace glow, portrait orientation, $S"
gen "offer-keepsake.jpg" "1152x864" "Warm living room Christmas scene with a vintage red telephone and a wax-sealed crimson letter on a wooden table beside a glowing Christmas tree, gold ornaments, $S"
gen "offer-call.jpg" "1152x864" "Excited young child speaking on a warm red vintage telephone beside a glowing Christmas tree at evening, wonder and joy on the face, cozy candlelight, $S"
gen "offer-letter.jpg" "1152x864" "Elegant handwritten letter sealed with a deep crimson wax seal stamped with a gold star crest, on a dark wood table with pine branches and gold ribbon, candlelight close-up, $S"
gen "offer-membership.jpg" "1152x864" "Cozy family advent scene, open advent calendar with 24 small golden doors, red candles and hot cocoa on a wooden table, warm evening glow, $S"
gen "offer-gifting.jpg" "1152x864" "Smiling elderly grandmother on a warm phone call with family, grandchild hugging her, Christmas tree with golden lights in background, heartwarming moment, $S"
gen "pillar-advent.jpg" "1024x1024" "Advent wreath with four red candles and golden ornaments, one candle lit, pine branches, warm candlelight close-up, $S"
gen "pillar-keepsake.jpg" "1024x1024" "Beautifully decorated Christmas living room at night with wrapped presents under the tree, magical warm golden light, $S"
gen "pillar-gift.jpg" "1024x1024" "Hands wrapping a golden gift box with crimson ribbon, charity giving concept, warm candlelight, pine branches, close-up, $S"
gen "video-poster.jpg" "1344x768" "Family sitting together on a sofa watching something magical, faces lit with warm golden glow, Christmas tree beside them at night, $S"

echo "=== TTS manifesto ==="
MANIFESTO="In a world that moves too quickly, we believe in pausing. We believe in candlelight on winter evenings. In stories told slowly. And in the quiet wonder in a child's eyes when the phone rings, and a familiar voice speaks their name. Klub Santa is not a passing novelty. It is a living Christmas tradition, and a global sanctuary for families who choose to protect wonder, year after year. Every call is spoken by name. Every letter is sealed in crimson wax and gold. And ten percent of every ritual brings Christmas to orphans and isolated elders around the world. We don't create the magic. You do. We simply give you the key. Klub Santa. Where believers belong."
if [ ! -s public/media/manifesto.mp3 ]; then
  z-ai tts -i "$MANIFESTO" -o public/media/manifesto.mp3 --voice jam --format mp3 && echo "OK manifesto.mp3" || echo "FAIL manifesto.mp3"
fi
echo "=== MEDIA DONE ==="
ls -la public/media/
