'use client'

import { ArrowRight } from 'lucide-react'
import { useRitualModal } from './ritual-context'
import { useNextChristmasCountdown } from './use-countdown'

export default function CountdownBanner(): React.JSX.Element {
  const { d, h, m, s } = useNextChristmasCountdown()
  const { openRitual } = useRitualModal()

  const protectWonder = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    openRitual('complete-keepsake-ritual')
  }

  return (
    <section className="home-section5 home-section5-countdown" aria-label="Christmas Eve Countdown">
      <div className="auto-container">
        <div className="sec-title">
          <h2>
            Traditions are not built in a day. They are built across generations.
            <em>Reserve your family&rsquo;s place by the fire before Christmas Eve</em>
          </h2>
        </div>
        <div className="btn-box">
          <a href="#santa-offers" className="theme-btn" onClick={protectWonder}>
            <span>Protect the Wonder Tonight</span>
            <ArrowRight className="ks-icon" aria-hidden="true" />
          </a>
        </div>
        <div className="time-counter">
          <div className="time-countdown" id="secondary-countdown">
            <div className="counter-column">
              <span className="count" id="sec-days">
                {d}
              </span>
              <span className="unit">Days</span>
            </div>
            <div className="counter-column">
              <span className="count" id="sec-hours">
                {h}
              </span>
              <span className="unit">Hours</span>
            </div>
            <div className="counter-column">
              <span className="count" id="sec-minutes">
                {m}
              </span>
              <span className="unit">Minutes</span>
            </div>
            <div className="counter-column">
              <span className="count" id="sec-seconds">
                {s}
              </span>
              <span className="unit">Seconds</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
