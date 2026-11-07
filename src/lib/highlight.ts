export type TokenKind = 'plain' | 'comment' | 'string' | 'decorator' | 'keyword' | 'number' | 'call' | 'builtin'

export interface Token {
  kind: TokenKind
  text: string
}

const RE =
  /(#[^\n]*)|("""[\s\S]*?"""|f?"(?:[^"\\\n]|\\.)*"|f?'(?:[^'\\\n]|\\.)*')|(@\w+)|\b(from|import|def|class|return|if|else|elif|for|in|with|as|lambda|None|True|False|and|or|not|async|await|yield)\b|\b(\d+(?:\.\d+)?)\b|\b(str|int|list|dict|TypedDict|Annotated|Literal)\b|(\w+)(?=\()/g

const KINDS: TokenKind[] = ['comment', 'string', 'decorator', 'keyword', 'number', 'builtin', 'call']

export function tokenize(code: string): Token[] {
  const out: Token[] = []
  let last = 0
  for (const m of code.matchAll(RE)) {
    const i = m.index ?? 0
    if (i > last) out.push({ kind: 'plain', text: code.slice(last, i) })
    const g = m.slice(1).findIndex((x) => x !== undefined)
    out.push({ kind: KINDS[g] ?? 'plain', text: m[0] })
    last = i + m[0].length
  }
  if (last < code.length) out.push({ kind: 'plain', text: code.slice(last) })
  return out
}
