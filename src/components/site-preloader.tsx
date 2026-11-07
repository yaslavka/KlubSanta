'use client'

import { useEffect, useState } from 'react'
import { BrandSplash } from '@/components/brand-splash'

const MIN_DISPLAY_MS = 700 // анти-мигание: даже при мгновенной загрузке бренд-момент состоялся
const MAX_WAIT_MS = 10_000 // страховка №1 (JS): зависший ресурс не держит посетителя вечно

/**
 * Публичный прелоадер сайта: висит ПОВЕРХ страницы и уходит только когда
 * загрузилось ВСЁ — все картинки, стили, скрипты и шрифты (window.load +
 * document.fonts.ready), а не только когда сервер отдал HTML.
 *
 * Слои защиты от «вечного лоадера»:
 * 1. JS-лимит 10 секунд (MAX_WAIT_MS);
 * 2. CSS-fallback (ks-preloader-autohide в globals.css): если hydration
 *    вообще не случился, анимация сама растворит оверлей через 12с;
 * 3. pointer-events: none — оверлей никогда не блокирует клики/скролл.
 */
export function SitePreloader() {
  const [phase, setPhase] = useState<'visible' | 'fading' | 'gone'>('visible')

  useEffect(() => {
    const startedAt = Date.now()
    let faded = false

    const beginFade = () => {
      if (faded) return
      faded = true
      const remaining = Math.max(0, MIN_DISPLAY_MS - (Date.now() - startedAt))
      setTimeout(() => setPhase('fading'), remaining)
    }

    // Ждём ПОЛНУЮ загрузку: окно (все img/css/js) + веб-шрифты.
    const windowLoaded = new Promise<void>((resolve) => {
      if (document.readyState === 'complete') {
        resolve()
        return
      }
      window.addEventListener('load', () => resolve(), { once: true })
    })
    const fontsReady: Promise<unknown> =
      typeof document !== 'undefined' && 'fonts' in document ? document.fonts.ready : Promise.resolve()

    void Promise.all([windowLoaded, fontsReady]).then(beginFade)
    const cap = setTimeout(beginFade, MAX_WAIT_MS)

    return () => {
      clearTimeout(cap)
    }
  }, [])

  if (phase === 'gone') return null

  // В фазе visible держим CSS-класс с fallback-анимацией; при fading класс
  // анимации снимается (иначе анимация перебивала бы transition непрозрачности).
  const overlayCls =
    phase === 'visible'
      ? 'ks-preloader-overlay opacity-100'
      : 'transition-opacity duration-700 ease-out opacity-0'

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-[9999] ${overlayCls}`}
      onTransitionEnd={() => {
        if (phase === 'fading') setPhase('gone')
      }}
      aria-hidden={phase === 'fading'}
    >
      <BrandSplash />
    </div>
  )
}
