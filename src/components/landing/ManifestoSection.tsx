'use client'

import { ArrowRight } from 'lucide-react'
import { useNextChristmasCountdown } from './use-countdown'

export default function ManifestoSection(): React.JSX.Element {
  const { d, h, m } = useNextChristmasCountdown()

  return (
    <section className="home-section1">
      <div className="container">
        <div className="countdown-container">
          <div className="countdown-header">
            <small>The Candlelight Gathering</small>
            Next Christmas Eve Ritual Begins In:
          </div>
          <div id="countdown-timer" className="countdown-timer">
            <div className="time-box">
              <span id="days">{d}</span>
              <span className="time-label">Days</span>
            </div>
            <div className="time-box">
              <span id="hours">{h}</span>
              <span className="time-label">Hours</span>
            </div>
            <div className="time-box">
              <span id="minutes">{m}</span>
              <span className="time-label">Minutes</span>
            </div>
          </div>
          <a href="#santa-offers" className="book-button">
            <span>Join the Tradition</span>
            <ArrowRight className="ks-icon" aria-hidden="true" />
          </a>
        </div>
      </div>

      <div className="santa-about" id="santa-about">
        <div className="santa-about-atmosphere" aria-hidden="true">
          <div className="santa-atmosphere-stars"></div>
          <div className="santa-atmosphere-pines"></div>
          <div className="santa-atmosphere-landscape"></div>
          <div className="santa-atmosphere-sleigh">
            <svg viewBox="0 0 360 110" role="presentation" focusable="false">
              <path d="M9 78c31-9 60-9 91 0 18-17 42-22 69-14 17-16 39-22 65-16 25-20 55-24 89-12-23 7-41 18-54 34-26-7-50-4-73 9-22-11-45-12-69-2-23-10-46-11-71-3-16 5-32 5-47 4z" />
            </svg>
          </div>
        </div>

        <div className="santa-about-grid">
          <div className="santa-about-copy">
            <div className="santa-about-label">
              <span></span>
              Our Belief &amp; Manifesto
            </div>
            <h2>
              In a world that moves too quickly, we believe in <em>pausing</em>.
            </h2>
            <div className="santa-about-intro">
              <p>
                We believe in candlelight on winter evenings. In stories told slowly. In the quiet
                wonder in a child&rsquo;s eyes when the phone rings and a familiar voice speaks their name.
              </p>
              <p>
                Klub Santa is not a passing novelty. It is a living Christmas tradition and a global
                sanctuary for families who choose to protect wonder year after year.
              </p>
            </div>
            <div className="santa-about-note">
              <p>
                &ldquo;We don&rsquo;t create the magic. You do. We simply give you the key.&rdquo;
              </p>
            </div>
          </div>

          <div className="santa-about-visual">
            <figure className="santa-about-frame">
              <img
                src="/media/about-santa.jpg"
                alt="Santa Claus reading the ledger of believers in a warm candlelit study"
                loading="lazy"
              />
              <figcaption className="santa-about-tag">
                <strong>Where Believers Belong</strong>
                <span>
                  Crafted for children, parents, grandparents, and every keeper of the Christmas
                  flame.
                </span>
              </figcaption>
            </figure>
          </div>

          <div className="santa-about-features">
            <div className="santa-feature">
              <span className="santa-feature-badge">RITUAL</span>
              <div>
                <h3>A Yearly Family Tradition</h3>
                <p>
                  Traditions are not built in a day. They are built across generations, one December
                  evening at a time.
                </p>
              </div>
            </div>
            <div className="santa-feature">
              <span className="santa-feature-badge">BELIEF</span>
              <div>
                <h3>Spoken by Name</h3>
                <p>
                  Every call and wax-sealed letter carries the personal memories, triumphs, and
                  kindnesses of your household.
                </p>
              </div>
            </div>
            <div className="santa-feature">
              <span className="santa-feature-badge">NORTH</span>
              <div>
                <h3>Guided by the North Star</h3>
                <p>
                  Available in 8 languages so families from Paris to Montreal, London to Hong Kong
                  can share the same warm hearth.
                </p>
              </div>
            </div>
            <div className="santa-feature">
              <span className="santa-feature-badge">KLUB</span>
              <div>
                <h3>A Circle of Generosity</h3>
                <p>
                  Ten percent of our seasonal ritual brings Christmas warmth to orphans and isolated
                  elders worldwide.
                </p>
              </div>
            </div>
          </div>

          <div className="santa-about-cta">
            <a href="#santa-offers" className="santa-about-button">
              <span>Choose Your Family Ritual</span>
              <ArrowRight className="ks-icon" aria-hidden="true" />
            </a>
            <span className="santa-about-subtext">
              Begin for less than a winter coffee - cherished long after the tree comes down.
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
