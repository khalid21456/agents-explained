import { Suspense, lazy } from 'react'
import { LESSONS } from '../lessons'
import Icon from './Icon'

const PixiHero = lazy(() => import('../canvases/PixiHero'))

export default function Home({ onMenu }: { onMenu: () => void }) {
  return (
    <div className="home">
      <Suspense fallback={<div className="hero-canvas" />}>
        <PixiHero />
      </Suspense>
      <div className="hero-fade" />
      <button type="button" className="icon-btn only-mobile home-menu" onClick={onMenu} aria-label="Open menu">
        <Icon name="menu" />
      </button>
      <div className="home-inner">
        <h1>
          How <span className="grad">AI Agents</span>
          <br />
          actually work
        </h1>
        <p className="hero-sub">
          Go from your first token to agents that reason, use tools and work as a team. Every concept comes alive: press play, step through it,
          and watch the state and the real code change together. Then go build your own.
        </p>
        <div className="cards">
          {LESSONS.map((l) => (
            <a key={l.id} href={`#/${l.id}`} className="card">
              <span className="card-num">{l.num}</span>
              <b>{l.nav}</b>
              <span>{l.blurb}</span>
            </a>
          ))}
        </div>
        <p className="credit home-credit">
          Created by <b>Khalid Edaoudi</b>
          <br />
          AI Engineer
        </p>
      </div>
    </div>
  )
}
