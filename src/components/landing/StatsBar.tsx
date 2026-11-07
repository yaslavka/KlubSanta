const HIGHLIGHTS = [
  { strong: '8 Languages', detail: 'EN · FR · ES · DE · IT · PT · 國語 · 粵語' },
  { strong: '10% Pledge', detail: 'Orphans & Isolated Elders' },
  { strong: '24 Days', detail: 'December Advent Ritual' },
  { strong: 'Heirloom Seal', detail: 'Crimson Wax & Gold Crest' },
  { strong: 'Multi-Year', detail: 'Continuity of Memory' },
  { strong: '1 Coffee', detail: 'Accessible Entry Ritual' },
] as const

export default function StatsBar(): React.JSX.Element {
  return (
    <section id="featured-in" className="home-section4">
      <div className="container">
        <div className="row">
          <div className="col-lg-3 col-md-12">
            <div className="featured-intro">
              <span className="featured-kicker">A Global Sanctuary</span>
              <h2>Shared Across 8 Languages &amp; Every Generation</h2>
            </div>
          </div>
          <div className="col-lg-9 col-md-12">
            <div className="featured-stage">
              <div className="sponsors-outer">
                {HIGHLIGHTS.map((highlight) => (
                  <div className="image-box" key={highlight.strong}>
                    <strong>{highlight.strong}</strong>
                    <span>{highlight.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
