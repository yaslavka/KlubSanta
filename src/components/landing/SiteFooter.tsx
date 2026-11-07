'use client'

import { ArrowUp, Bell, Facebook, Instagram, Mail, Music2, Star } from 'lucide-react'
import { useRitualModal } from './ritual-context'

type SiteFooterProps = {
  contactEmail: string
}

const SACRED_QUESTIONS = [
  'What makes Klub Santa different?',
  'How does Santa know their story?',
  'Is it only for young children?',
  'Which 8 languages are spoken?',
  'How does the 10% charity pledge work?',
] as const

const SANCTUARY_LINKS = [
  { href: '#home-hero', label: 'Home Hearth' },
  { href: '#santa-about', label: 'Our Belief & Manifesto' },
  { href: '#santa-offers', label: 'Five Ways to Belong' },
  { href: '#north-pole-journey', label: 'The North Pole Journey' },
  { href: '#testimonials', label: 'Voices From the Circle' },
  { href: '#magic-preview', label: 'Audio & Film Preview' },
] as const

export default function SiteFooter({ contactEmail }: SiteFooterProps): React.JSX.Element {
  const { openRitual } = useRitualModal()

  const beginRitual = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    openRitual()
  }

  const backToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer className="tts-night-footer" id="site-footer">
      <div className="tts-night-footer__sky" aria-hidden="true">
        <div className="tts-night-footer__stars"></div>
        <div className="tts-night-footer__trees"></div>
        <div className="tts-night-footer__workshop">
          <span className="tts-night-footer__window"></span>
          <span className="tts-night-footer__window"></span>
          <span className="tts-night-footer__window"></span>
        </div>
      </div>

      <button type="button" className="tts-night-footer__top" id="btn-back-to-top" aria-label="Back to top" onClick={backToTop}>
        <ArrowUp className="ks-icon" aria-hidden="true" />
      </button>

      <div className="auto-container tts-night-footer__inner">
        <div className="tts-night-footer__grid">
          <div className="tts-night-footer__brand">
            <a href="#home-hero" className="tts-night-footer__logo" aria-label="Klub Santa Home">
              <img src="/media/logo.svg" alt="Klub Santa Crest" />
            </a>
            <p className="tts-night-footer__kicker">Where Believers Belong</p>
            <p className="tts-night-footer__lead">
              In a world that moves too quickly, we believe in pausing. We don&rsquo;t create the magic.
              You do. We simply give you the key.
            </p>
            <a href="#santa-offers" className="tts-night-footer__cta" onClick={beginRitual}>
              <Bell className="ks-icon" aria-hidden="true" />
              <span>Begin Your Family Ritual</span>
            </a>
          </div>

          <div className="tts-night-footer__col">
            <h2 className="tts-night-footer__heading">Sacred Questions</h2>
            <ul className="tts-night-footer__list">
              {SACRED_QUESTIONS.map((question) => (
                <li key={question}>
                  <a href="#sacred-questions">
                    <Star className="ks-icon" aria-hidden="true" /> {question}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="tts-night-footer__col">
            <h2 className="tts-night-footer__heading">The Sanctuary</h2>
            <ul className="tts-night-footer__list">
              {SANCTUARY_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div className="tts-night-footer__col">
            <h2 className="tts-night-footer__heading">North Pole Post</h2>
            <p className="tts-night-footer__text">
              Questions about a family gathering, a Gifting Token, or our charitable partnerships?
              Write to our keepers of the ledger.
            </p>
            <a href={`mailto:${contactEmail}`} className="tts-night-footer__mail">
              <Mail className="ks-icon" aria-hidden="true" />
              <span>{contactEmail}</span>
            </a>
            <ul className="tts-night-footer__social" aria-label="Social links">
              <li>
                <a href="https://klubsanta.com" aria-label="Instagram">
                  <Instagram className="ks-icon" aria-hidden="true" />
                </a>
              </li>
              <li>
                <a href="https://klubsanta.com" aria-label="Facebook">
                  <Facebook className="ks-icon" aria-hidden="true" />
                </a>
              </li>
              <li>
                <a href="https://klubsanta.com" aria-label="TikTok">
                  <Music2 className="ks-icon" aria-hidden="true" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="tts-night-footer__bottom">
          <p>&copy; 2026 Klub Santa (klubsanta.com). All rights reserved. Built across generations.</p>
          <ul className="tts-night-footer__legal">
            <li>
              <a href="#sacred-questions">Privacy &amp; Child Safety</a>
            </li>
            <li>
              <a href="#sacred-questions">Terms of Belonging</a>
            </li>
            <li>
              <a href={`mailto:${contactEmail}`}>Contact the Sanctuary</a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
