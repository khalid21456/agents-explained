import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import Home from './components/Home'
import LessonView from './components/LessonView'
import { LESSONS } from './lessons'
import type { Opts } from './lessons/types'

function readRoute() {
  return window.location.hash.replace(/^#\/?/, '')
}

export default function App() {
  const [route, setRoute] = useState(readRoute)
  const [menu, setMenu] = useState(false)
  const [optsById, setOptsById] = useState<Record<string, Opts>>({})

  useEffect(() => {
    const onHash = () => {
      setRoute(readRoute())
      setMenu(false)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const lesson = LESSONS.find((l) => l.id === route)
  const opts: Opts = lesson ? (optsById[lesson.id] ?? lesson.defaults ?? {}) : {}

  const setOpt = (key: string, value: string) => {
    if (!lesson) return
    const id = lesson.id
    const base = lesson.defaults ?? {}
    setOptsById((m) => ({ ...m, [id]: { ...(m[id] ?? base), [key]: value } }))
  }

  useEffect(() => {
    document.title = lesson ? `${lesson.nav} · Agents, Explained` : 'Agents, Explained'
  }, [lesson])

  return (
    <div className="app">
      <Sidebar current={lesson ? lesson.id : ''} open={menu} onClose={() => setMenu(false)} opts={opts} setOpt={setOpt} />
      <main className="main">
        {lesson ? (
          <LessonView key={lesson.id} lesson={lesson} opts={opts} setOpt={setOpt} onMenu={() => setMenu(true)} />
        ) : (
          <Home onMenu={() => setMenu(true)} />
        )}
      </main>
    </div>
  )
}
