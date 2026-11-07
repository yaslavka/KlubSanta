'use client'

import { useEffect, useRef, useState } from 'react'
import { Pause, Play, Volume2, VolumeX } from 'lucide-react'

type MagicPreviewProps = {
  previewVideoExists: boolean
  manifestoExists: boolean
}

export default function MagicPreview({
  previewVideoExists,
  manifestoExists,
}: MagicPreviewProps): React.JSX.Element {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [videoPlaying, setVideoPlaying] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onPlay = () => setAudioPlaying(true)
    const onStop = () => setAudioPlaying(false)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onStop)
    audio.addEventListener('ended', onStop)
    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onStop)
      audio.removeEventListener('ended', onStop)
      audio.pause()
    }
  }, [manifestoExists])

  const toggleManifesto = () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      void audio.play()
    } else {
      audio.pause()
    }
  }

  const playPreviewVideo = () => {
    const video = videoRef.current
    if (!video) return
    void video.play()
  }

  const handleVideoPlay = () => setVideoPlaying(true)

  const handleVideoPause = () => {
    const video = videoRef.current
    if (video && (video.currentTime === 0 || video.ended)) {
      setVideoPlaying(false)
    }
  }

  const audioFallbackActive = !previewVideoExists && manifestoExists

  return (
    <section id="magic-preview" className="home-section7">
      <div className="container">
        <div className="home-video-layout">
          <div className="home-video-copy">
            <span className="home-video-kicker">Step Inside the Sanctuary</span>
            <h2>Feel the Warmth Before the Phone Even Rings</h2>
            <p>
              Watch how a quiet winter evening transforms when a family gathers by candlelight, and
              listen to the spoken Klub Santa Manifesto that guides everything we build.
            </p>
            <div className="home-video-benefits">
              <div className="home-video-benefit">
                <span>✦</span>
                Unhurried, cinema-grade storytelling rooted in timeless tradition
              </div>
              <div className="home-video-benefit">
                <span>✦</span>
                Personalised for children, doubting tweens, parents, and elders
              </div>
              <div className="home-video-benefit">
                <span>✦</span>
                Protected privacy and parent-guided scheduling at every step
              </div>
            </div>

            {manifestoExists ? (
              <div className="ks-audio-ritual-box">
                <div>
                  <strong>Listen to the Klub Santa Story</strong>
                  <small>Audio Manifesto &amp; Founder&rsquo;s Vision</small>
                </div>
                <button type="button" className="ks-audio-btn" id="ks-audio-toggle" onClick={toggleManifesto}>
                  {audioPlaying ? (
                    <VolumeX className="ks-icon" aria-hidden="true" />
                  ) : (
                    <Volume2 className="ks-icon" aria-hidden="true" />
                  )}
                  <span>{audioPlaying ? 'Pause Audio Story' : 'Play Audio Story'}</span>
                </button>
                <audio id="ks-pitch-audio" preload="none" src="/media/manifesto.mp3" ref={audioRef}></audio>
              </div>
            ) : null}
          </div>

          <div className="home-video-card-wrap">
            <div className={`home-video-card${videoPlaying ? ' is-playing' : ''}`} id="ks-preview-card">
              <div className="home-video-frame">
                <div className="home-video-badge">
                  <span></span>
                  Inside Klub Santa
                </div>
                {previewVideoExists ? (
                  <video
                    id="ks-preview-video"
                    ref={videoRef}
                    preload="metadata"
                    playsInline
                    poster="/media/video-poster.jpg"
                    controls
                    onPlay={handleVideoPlay}
                    onPause={handleVideoPause}
                  >
                    <source src="/media/preview.mp4" type="video/mp4" />
                  </video>
                ) : (
                  <img
                    className="ks-video-poster"
                    src="/media/video-poster.jpg"
                    alt="Inside the Klub Santa sanctuary - families gathered by candlelight"
                    loading="lazy"
                  />
                )}
                {previewVideoExists ? (
                  <button
                    type="button"
                    className="home-video-play"
                    id="ks-preview-play"
                    aria-label="Play Klub Santa film"
                    onClick={playPreviewVideo}
                  >
                    <span className="home-video-play-icon">
                      <Play className="ks-icon" aria-hidden="true" />
                    </span>
                    <span>Watch the Ritual</span>
                  </button>
                ) : null}
                {audioFallbackActive ? (
                  <button
                    type="button"
                    className="home-video-play"
                    id="ks-preview-play"
                    aria-label={audioPlaying ? 'Pause the Klub Santa audio story' : 'Play the Klub Santa audio story'}
                    onClick={toggleManifesto}
                  >
                    <span className="home-video-play-icon">
                      {audioPlaying ? (
                        <Pause className="ks-icon" aria-hidden="true" />
                      ) : (
                        <Play className="ks-icon" aria-hidden="true" />
                      )}
                    </span>
                    <span>{audioPlaying ? 'Pause the Ritual' : 'Watch the Ritual'}</span>
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
