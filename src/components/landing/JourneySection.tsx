'use client'

import { useEffect, useRef } from 'react'
import { ArrowRight } from 'lucide-react'

const JOURNEY_STAGE_TOPS = [
  { num: '01', tag: 'The Whisper' },
  { num: '02', tag: 'The Seal' },
  { num: '03', tag: 'The Sanctuary' },
  { num: '04', tag: 'The Gathering' },
  { num: '05', tag: 'The Legacy' },
] as const

const JOURNEY_STAGES = [
  {
    top: JOURNEY_STAGE_TOPS[0],
    title: 'You Share Their Story',
    copy: 'Tell us their name, the quiet kindnesses you noticed this year, and the little family traditions only Santa could know.',
  },
  {
    top: JOURNEY_STAGE_TOPS[1],
    title: 'Carried by the North Star',
    copy: 'Your notes are inscribed into the Klub Santa ledger and sealed for the exact winter evening your family gathers.',
  },
  {
    top: JOURNEY_STAGE_TOPS[2],
    title: 'Prepared in Candlelight',
    copy: "Inside the study, Santa prepares their message in your family's native tongue - warm, unhurried, and deeply personal.",
  },
  {
    top: JOURNEY_STAGE_TOPS[3],
    title: 'The Phone Rings at Home',
    copy: 'Gather by the tree. When they answer and hear Santa speak their name, wonder fills the room across every generation.',
  },
  {
    top: JOURNEY_STAGE_TOPS[4],
    title: 'Kept Year After Year',
    copy: 'Save your recording and wax-sealed letter in your family archive, ready to build upon when next December arrives.',
  },
] as const

const JOURNEY_SCENE_NAMES = [
  'scene-letter',
  'scene-envelope',
  'scene-workshop',
  'scene-call',
  'scene-memory',
] as const

function JourneyScene({ index }: { index: number }): React.JSX.Element {
  const name = JOURNEY_SCENE_NAMES[index]

  if (name === 'scene-letter') {
    return (
      <div className="journey-scene scene-letter" aria-hidden="true">
        <div className="scene-paper">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div className="scene-quill"></div>
      </div>
    )
  }

  if (name === 'scene-envelope') {
    return (
      <div className="journey-scene scene-envelope" aria-hidden="true">
        <div className="scene-flight"></div>
        <div className="scene-mail"></div>
        <div className="scene-wax"></div>
      </div>
    )
  }

  if (name === 'scene-workshop') {
    return (
      <div className="journey-scene scene-workshop" aria-hidden="true">
        <div className="scene-tree scene-tree-left"></div>
        <div className="scene-tree scene-tree-right"></div>
        <div className="scene-cabin">
          <div className="scene-roof"></div>
          <div className="scene-window"></div>
          <div className="scene-door"></div>
        </div>
      </div>
    )
  }

  if (name === 'scene-call') {
    return (
      <div className="journey-scene scene-call" aria-hidden="true">
        <div className="scene-wave"></div>
        <div className="scene-wave scene-wave-two"></div>
        <div className="scene-screen">
          <div className="scene-santa-hat"></div>
          <div className="scene-santa-face"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="journey-scene scene-memory" aria-hidden="true">
      <div className="scene-photo"></div>
      <div className="scene-heart"></div>
      <div className="scene-ribbon"></div>
    </div>
  )
}

export default function JourneySection(): React.JSX.Element {
  const sectionRef = useRef<HTMLElement | null>(null)
  const mapRef = useRef<HTMLDivElement | null>(null)

  // Scroll-activated journey map, computed exactly like the original script.
  useEffect(() => {
    const section = sectionRef.current
    const map = mapRef.current
    if (!section || !map) return

    const stages = Array.from(section.querySelectorAll<HTMLElement>('[data-journey-stage]'))
    if (stages.length === 0) return

    const updateJourneyProgress = () => {
      const rect = section.getBoundingClientRect()
      const vh = window.innerHeight || document.documentElement.clientHeight
      const total = rect.height + vh * 0.45
      const travelled = vh * 0.72 - rect.top
      const progress = Math.max(0.08, Math.min(1, travelled / total))
      map.style.setProperty('--journey-progress', progress.toFixed(3))

      const activeIndex = Math.min(stages.length - 1, Math.floor(progress * stages.length))
      stages.forEach((stage, idx) => {
        stage.classList.toggle('is-active', idx <= activeIndex)
        stage.classList.toggle('is-current', idx === activeIndex)
      })
    }

    updateJourneyProgress()
    window.addEventListener('scroll', updateJourneyProgress, { passive: true })
    window.addEventListener('resize', updateJourneyProgress)
    return () => {
      window.removeEventListener('scroll', updateJourneyProgress)
      window.removeEventListener('resize', updateJourneyProgress)
    }
  }, [])

  return (
    <section
      id="north-pole-journey"
      className="north-pole-journey"
      aria-label="How Your Family Ritual Comes to Life"
      ref={sectionRef}
    >
      <div className="journey-sky" aria-hidden="true">
        <div className="journey-stars"></div>
        <div className="journey-aurora"></div>
        <div className="journey-hills"></div>
      </div>

      <div className="container">
        <div className="journey-heading">
          <p className="journey-kicker">
            <span></span>Follow the North Star
          </p>
          <h2>
            How Your Family&rsquo;s <em>Ritual</em> Travels From Your Hearth to the North Pole
          </h2>
          <p>
            Every detail you entrust to us is woven into a quiet, unhurried story so that when
            December arrives, the wonder feels effortless and real.
          </p>
        </div>

        <div className="journey-map" data-journey-map ref={mapRef}>
          <svg
            className="journey-path"
            viewBox="0 0 1200 580"
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <linearGradient id="journeyTrailGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#D0A56A" />
                <stop offset="52%" stopColor="#F8DFAF" />
                <stop offset="100%" stopColor="#A11224" />
              </linearGradient>
            </defs>
            <path
              className="journey-path-track"
              pathLength={100}
              d="M 90 360 C 210 340, 230 155, 360 165 C 490 175, 495 390, 610 385 C 735 380, 745 145, 865 150 C 980 155, 1005 315, 1110 300"
            />
            <path
              className="journey-path-progress"
              pathLength={100}
              d="M 90 360 C 210 340, 230 155, 360 165 C 490 175, 495 390, 610 385 C 735 380, 745 145, 865 150 C 980 155, 1005 315, 1110 300"
            />
          </svg>

          <div className="journey-comet" aria-hidden="true"></div>

          <ol className="journey-stages">
            {JOURNEY_STAGES.map((stage, index) => (
              <li
                key={stage.top.num}
                className={`journey-stage${index === 0 ? ' is-active is-current' : ''}`}
                data-journey-stage={index}
              >
                <div className="journey-stage-top">
                  <span className="journey-step-num">{stage.top.num}</span>
                  <span className="journey-step-tag">{stage.top.tag}</span>
                </div>
                <JourneyScene index={index} />
                <h3>{stage.title}</h3>
                <p>{stage.copy}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="journey-ending">
          <p>
            <strong>We don&rsquo;t create the magic. You do.</strong> We simply give you the key to
            turn a fleeting December evening into a lifelong family tradition.
          </p>
          <a href="#santa-offers" className="journey-cta">
            <span>Start Your Journey</span>
            <ArrowRight className="ks-icon" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  )
}
