import type { ReactNode } from 'react'
import Reveal from './Reveal'

interface Props {
  id: string
  num: string
  kicker: string
  title: ReactNode
  lead: ReactNode
  children: ReactNode
}

export default function Section({ id, num, kicker, title, lead, children }: Props) {
  return (
    <section id={id} className="section">
      <Reveal className="section-head">
        <span className="eyebrow">
          <b>{num}</b>
          {kicker}
        </span>
        <h2>{title}</h2>
        <p className="lead">{lead}</p>
      </Reveal>
      {children}
    </section>
  )
}
