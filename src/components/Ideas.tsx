import Reveal from './Reveal'

export interface Idea {
  title: string
  body: string
  color?: string
}

export default function Ideas({ items }: { items: Idea[] }) {
  return (
    <div className="ideas">
      {items.map((it, i) => (
        <Reveal key={it.title} delay={i * 90} className="idea">
          <span className="idea-dot" style={{ background: it.color ?? 'var(--cyan)', boxShadow: `0 0 18px ${it.color ?? 'var(--cyan)'}` }} />
          <h4>{it.title}</h4>
          <p>{it.body}</p>
        </Reveal>
      ))}
    </div>
  )
}
