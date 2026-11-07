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
        <span className="pill">
          <span className="live-dot" /> An interactive field guide
        </span>
        <h1>
          How <span className="grad">AI Agents</span>
          <br />
          actually work
        </h1>
        <p className="hero-sub">
          From next-token prediction to stateful agents built with LangGraph. Pick a concept, press play, step through it, and watch the state and
          the code change together.
        </p>
        <div className="hero-ctas">
          <a href={`#/${LESSONS[0].id}`} className="primary-btn big">
            <Icon name="play" size={18} /> Start with the basics
          </a>
          <a href="#/langgraph" className="ghost-btn big">
            Jump to LangGraph
          </a>
        </div>
        <div className="cards">
          {LESSONS.map((l) => (
            <a key={l.id} href={`#/${l.id}`} className="card">
              <span className="card-num">{l.num}</span>
              <b>{l.nav}</b>
              <span>{l.blurb}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
