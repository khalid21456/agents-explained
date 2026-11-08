import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import Home from './components/Home'
import LessonView from './components/LessonView'
import { LESSONS } from './lessons'
import type { Opts } from './lessons/types'

function readRoute() {
  return window.location.hash.replace(/^#\/?/, '')
}

function readFlag(key: string) {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function writeFlag(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? '1' : '0')
  } catch {
    return
  }
}

export default function App() {
  const [route, setRoute] = useState(readRoute)
  const [menu, setMenu] = useState(false)
  const [optsById, setOptsById] = useState<Record<string, Opts>>({})
  const [sideHidden, setSideHidden] = useState(() => readFlag('ui.sideHidden'))
  const [codeHidden, setCodeHidden] = useState(() => readFlag('ui.codeHidden'))

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

  const toggleSide = () => {
    const next = !sideHidden
    setSideHidden(next)
    writeFlag('ui.sideHidden', next)
  }

  const toggleCode = () => {
    const next = !codeHidden
    setCodeHidden(next)
    writeFlag('ui.codeHidden', next)
  }

  useEffect(() => {
    document.title = lesson ? `${lesson.nav} · Agents, Explained` : 'Agents, Explained'
  }, [lesson])

  return (
    <div className={`app ${lesson && sideHidden ? 'side-hidden' : ''}`}>
      <Sidebar
        current={lesson ? lesson.id : ''}
        open={menu}
        onClose={() => setMenu(false)}
        opts={opts}
        setOpt={setOpt}
        onCollapse={lesson ? toggleSide : undefined}
      />
      <main className="main">
        {lesson ? (
          <LessonView
            key={lesson.id}
            lesson={lesson}
            opts={opts}
            setOpt={setOpt}
            onMenu={() => setMenu(true)}
            panels={{ sideHidden, codeHidden, toggleSide, toggleCode }}
          />
        ) : (
          <Home onMenu={() => setMenu(true)} />
        )}
      </main>
    </div>
  )
}
