import { useEffect, useState } from 'react'

const SECTIONS = [
  { id: 'llm', label: 'LLM' },
  { id: 'loop', label: 'Agent loop' },
  { id: 'tools', label: 'Tools' },
  { id: 'memory', label: 'Memory' },
  { id: 'langchain', label: 'LangChain' },
  { id: 'langgraph', label: 'LangGraph' },
  { id: 'multi', label: 'Multi-agent' },
  { id: 'big-picture', label: 'Big picture' },
]

export default function Nav() {
  const [active, setActive] = useState('')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProgress(max > 0 ? window.scrollY / max : 0)
      let current = ''
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id)
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.4) current = s.id
      }
      setActive(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <header className="nav">
      <div className="nav-inner">
        <a href="#top" className="brand">
          <span className="brand-mark" />
          <b>
            agents<span>.explained</span>
          </b>
        </a>
        <nav>
          {SECTIONS.map((s, i) => (
            <a key={s.id} href={`#${s.id}`} className={active === s.id ? 'on' : ''}>
              <small>{String(i + 1).padStart(2, '0')}</small>
              {s.label}
            </a>
          ))}
        </nav>
      </div>
      <div className="nav-progress" style={{ transform: `scaleX(${progress})` }} />
    </header>
  )
}
