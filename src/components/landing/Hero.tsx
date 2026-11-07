'use client'

import { useEffect, useRef } from 'react'
import { ArrowRight, Play } from 'lucide-react'

type HeroProps = {
  heroVideoExists: boolean
}

export default function Hero({ heroVideoExists }: HeroProps): React.JSX.Element {
  const heroRef = useRef<HTMLElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  // Full-bleed hero video watchdog (TalkToSanta exact pattern):
  // reveal the <video> layer only while frames are actually playing.
  useEffect(() => {
    if (!heroVideoExists) return
    const hero = heroRef.current
    const video = videoRef.current
    if (!hero || !video) return

    const markPlaying = () => {
      if (video.currentTime > 0 && !video.paused && !video.ended) {
        hero.classList.add('is-video-playing')
      }
    }
    const markStopped = () => hero.classList.remove('is-video-playing')

    video.addEventListener('playing', markPlaying)
    video.addEventListener('timeupdate', markPlaying)
    video.addEventListener('pause', markStopped)
    video.addEventListener('error', markStopped)
    const playAttempt = video.play()
    if (playAttempt && typeof playAttempt.catch === 'function') {
      playAttempt.catch(markStopped)
    }

    return () => {
      video.removeEventListener('playing', markPlaying)
      video.removeEventListener('timeupdate', markPlaying)
      video.removeEventListener('pause', markStopped)
      video.removeEventListener('error', markStopped)
    }
  }, [heroVideoExists])

  return (
    <section className="tts-hero" id="home-hero" aria-label="Where Believers Belong" ref={heroRef}>
      <div className="tts-hero__media" aria-hidden="true">
        <picture className="tts-hero__poster">
          <img
            src="/media/hero-family.png"
            alt=""
            width={1920}
            height={1080}
            fetchPriority="high"
            decoding="async"
          />
        </picture>
        {heroVideoExists ? (
          <video
            id="home-hero-video"
            ref={(node) => {
              videoRef.current = node
              if (node) node.muted = true
            }}
            className="tts-hero__video"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/media/hero-family.png"
            disablePictureInPicture
          >
            <source src="/media/hero.mp4" type="video/mp4" />
          </video>
        ) : null}
        <div className="tts-hero__shade"></div>
      </div>

      <div className="tts-hero__content">
        <p className="tts-hero__eyebrow">A TRADITION WORTH KEEPING</p>
        <h1>
          Where Believers Belong
          <em>A Living Christmas Ritual</em>
        </h1>
        <p className="tts-hero__support">
          In a world that moves too quickly, we believe in pausing. Begin a cherished family ritual
          with a personal call from Santa, wax-sealed keepsakes, and a global circle built across
          generations.
        </p>
        <div className="tts-hero__actions">
          <a href="#santa-offers" className="tts-hero__cta">
            <span>Explore the Rituals</span>
            <ArrowRight className="ks-icon" aria-hidden="true" />
          </a>
          <a href="#magic-preview" className="tts-hero__cta-secondary">
            <Play className="ks-icon" aria-hidden="true" />
            <span>Hear Our Manifesto</span>
          </a>
        </div>
        <ul className="tts-hero__trust" aria-label="What families receive">
          <li>Personalised by Name in 8 Languages</li>
          <li>A Yearly Family Ritual</li>
          <li>10% Dedicated to Orphans &amp; Elders</li>
        </ul>
      </div>
    </section>
  )
}
