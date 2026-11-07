'use client'

import { useEffect, useState } from 'react'

export type ChristmasCountdown = {
  d: string
  h: string
  m: string
  s: string
}

const pad = (n: number): string => (n < 10 ? `0${n}` : String(n))

// Next Christmas Eve 20:00 local time, mirroring the original script:
// if this year's moment has passed, aim at next year's.
function nextChristmasEve(from: Date): Date {
  const target = new Date(from.getFullYear(), 11, 24, 20, 0, 0)
  if (from.getTime() > target.getTime()) {
    target.setFullYear(from.getFullYear() + 1)
  }
  return target
}

// Shared 1s-interval countdown used by the Manifesto bar (d/h/m)
// and the CountdownBanner (d/h/m/s).
export function useNextChristmasCountdown(): ChristmasCountdown {
  const [countdown, setCountdown] = useState<ChristmasCountdown>({
    d: '00',
    h: '00',
    m: '00',
    s: '00',
  })

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const target = nextChristmasEve(now)
      const diff = Math.max(0, target.getTime() - now.getTime())
      setCountdown({
        d: pad(Math.floor(diff / 86_400_000)),
        h: pad(Math.floor(diff / 3_600_000) % 24),
        m: pad(Math.floor(diff / 60_000) % 60),
        s: pad(Math.floor(diff / 1_000) % 60),
      })
    }

    update()
    const interval = window.setInterval(update, 1000)
    return () => window.clearInterval(interval)
  }, [])

  return countdown
}
