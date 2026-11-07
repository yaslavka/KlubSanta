'use client'

import { useState } from 'react'
import { Bell, Compass, Feather, MailOpen, Phone, Snowflake, Star, Users } from 'lucide-react'
import { useRitualModal } from './ritual-context'

const SNOWFLAKE_SLOTS = [1, 2, 3, 4, 5, 6] as const

const NAV_LINKS = [
  { href: '#santa-about', label: 'Our Belief', Icon: Feather },
  { href: '#santa-offers', label: 'Call From Santa', Icon: Phone },
  { href: '#north-pole-journey', label: 'The North Pole Journey', Icon: Compass },
  { href: '#santa-fun-things', label: 'The Community', Icon: Users },
] as const

export default function SiteHeader(): React.JSX.Element {
  const [navOpen, setNavOpen] = useState(false)
  const { openRitual } = useRitualModal()

  const beginTradition = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    setNavOpen(false)
    openRitual()
  }

  const closeNav = () => setNavOpen(false)

  return (
    <header className="main-header frontend-main-header">
      <div className="main-box">
        <div className="tts-header-lights" aria-hidden="true">
          <span className="tts-light tts-light--red"></span>
          <span className="tts-light tts-light--gold"></span>
          <span className="tts-light tts-light--green"></span>
          <span className="tts-light tts-light--ice"></span>
          <span className="tts-light tts-light--red"></span>
          <span className="tts-light tts-light--gold"></span>
          <span className="tts-light tts-light--green"></span>
          <span className="tts-light tts-light--ice"></span>
        </div>
        <div className="tts-header-snow" aria-hidden="true">
          {SNOWFLAKE_SLOTS.map((slot) => (
            <Snowflake key={slot} className={`ks-icon tts-snow-icon tts-snow-icon--${slot}`} aria-hidden="true" />
          ))}
        </div>
        <div className="auto-container clearfix">
          <nav className="navbar tts-navigation" aria-label="Primary navigation">
            <a className="navbar-brand tts-brand" href="#home-hero" onClick={closeNav}>
              <img src="/media/logo.svg" alt="Klub Santa - Where Believers Belong" />
              <span className="tts-brand-wordmark">
                <strong>Klub Santa</strong>
                <span>Where Believers Belong</span>
              </span>
            </a>

            <a className="tts-mobile-cta" href="#santa-offers" onClick={closeNav}>
              <Star className="ks-icon" aria-hidden="true" />
              <span>Begin Ritual</span>
            </a>

            <button
              type="button"
              className="navbar-toggler tts-toggler"
              id="ks-nav-toggler"
              aria-controls="navbarSupportedContent"
              aria-expanded={navOpen}
              aria-label="Toggle navigation"
              onClick={() => setNavOpen((open) => !open)}
            >
              <span className="tts-toggler-line"></span>
              <span className="tts-toggler-line"></span>
              <span className="tts-toggler-line"></span>
            </button>

            <div
              className={`navbar-collapse tts-nav-collapse${navOpen ? ' is-open' : ''}`}
              id="navbarSupportedContent"
            >
              <ul className="navbar-nav tts-nav-list">
                {NAV_LINKS.map(({ href, label, Icon }) => (
                  <li className="nav-item tts-nav-item" key={href}>
                    <a className="nav-link tts-nav-link" href={href} onClick={closeNav}>
                      <Icon className="ks-icon" aria-hidden="true" />
                      <span>{label}</span>
                    </a>
                  </li>
                ))}
                <li className="nav-item tts-nav-item">
                  <a
                    className="nav-link tts-nav-link tts-nav-link--pill"
                    href="#santa-offers"
                    onClick={beginTradition}
                  >
                    <Bell className="ks-icon" aria-hidden="true" />
                    <span>Begin the Tradition</span>
                  </a>
                </li>
                <li className="nav-item tts-nav-item tts-nav-item--contact">
                  <a className="nav-link tts-nav-link tts-nav-link--contact" href="#north-pole-newsletter" onClick={closeNav}>
                    <MailOpen className="ks-icon" aria-hidden="true" />
                    <span>North Pole Post</span>
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
}
