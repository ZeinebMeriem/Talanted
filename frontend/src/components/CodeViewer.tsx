import React, { useCallback, useMemo, useState } from 'react'

export type FileNode =
  | { id: string; type: 'file'; name: string }
  | { id: string; type: 'folder'; name: string; open: boolean; children: FileNode[] }

interface CodeFile { path: string; content: string }

interface CodeViewerProps {
  tree: FileNode[]
  setTree: (tree: FileNode[]) => void
  activeFileId: string | null
  setActiveFileId: (id: string) => void
  effectiveFileContents: Map<string, CodeFile>
}

/* ── Dracula-ish palette ── */
const C = {
  keyword:  '#ff79c6',
  string:   '#50fa7b',
  comment:  '#6272a4',
  number:   '#bd93f9',
  type:     '#8be9fd',
  fn:       '#50fa7b',
  plain:    '#f8f8f2',
  punct:    '#f8f8f2',
  tag:      '#ff79c6',
  attr:     '#50fa7b',
  operator: '#ff79c6',
}

const JS_KEYWORDS = new Set([
  'import','from','export','default','const','let','var','function','return',
  'if','else','for','while','do','class','interface','type','extends','implements',
  'new','this','super','async','await','try','catch','finally','throw',
  'typeof','instanceof','void','null','undefined','true','false',
  'in','of','switch','case','break','continue','enum','readonly','static',
  'public','private','protected','abstract','override','as','declare',
])

function esc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}
function span(color: string, text: string): string {
  return `<span style="color:${color}">${esc(text)}</span>`
}

/* ── tokenise a single physical line (caller tracks multi-line state) ── */
interface LineState { inBlockComment: boolean; inTemplateLit: boolean }

function highlightLine(
  raw: string,
  ext: string,
  state: LineState,
): { html: string; nextState: LineState } {
  if (!['js','jsx','ts','tsx'].includes(ext)) {
    return { html: esc(raw), nextState: state }
  }

  let html   = ''
  let i      = 0
  let inBC   = state.inBlockComment
  let inTmpl = state.inTemplateLit
  const n    = raw.length

  while (i < n) {
    /* ── inside a block comment ── */
    if (inBC) {
      const end = raw.indexOf('*/', i)
      if (end === -1) {
        html += span(C.comment, raw.slice(i))
        i = n
      } else {
        html += span(C.comment, raw.slice(i, end + 2))
        i   = end + 2
        inBC = false
      }
      continue
    }

    /* ── start of block comment ── */
    if (raw[i] === '/' && raw[i+1] === '*') {
      inBC = true
      i   += 2
      continue
    }

    /* ── single-line comment ── */
    if (raw[i] === '/' && raw[i+1] === '/') {
      html += span(C.comment, raw.slice(i))
      i = n
      continue
    }

    /* ── template literal ── */
    if (raw[i] === '`') {
      if (inTmpl) {
        html   += span(C.string, '`')
        inTmpl  = false
        i++
        continue
      } else {
        inTmpl = true
        html  += span(C.string, '`')
        i++
        continue
      }
    }
    if (inTmpl) {
      let j = i
      while (j < n && raw[j] !== '`' && !(raw[j] === '$' && raw[j+1] === '{')) j++
      html += span(C.string, raw.slice(i, j))
      i     = j
      if (i < n && raw[i] === '$' && raw[i+1] === '{') {
        html += span(C.punct, '${')
        i += 2
        inTmpl = false
      }
      continue
    }

    /* ── single or double quoted string ── */
    if (raw[i] === '"' || raw[i] === "'") {
      const q = raw[i]
      let j   = i + 1
      while (j < n && raw[j] !== q) {
        if (raw[j] === '\\') j++
        j++
      }
      html += span(C.string, raw.slice(i, j + 1))
      i     = j + 1
      continue
    }

    /* ── JSX / HTML opening tag ── */
    if (raw[i] === '<' && /[A-Za-z/]/.test(raw[i+1] ?? '')) {
      html += span(C.tag, '<')
      i++
      // tag name
      const start = i
      while (i < n && /[A-Za-z0-9._/-]/.test(raw[i])) i++
      html += span(C.tag, raw.slice(start, i))
      continue
    }
    if (raw[i] === '>') { html += span(C.tag, '>'); i++; continue }

    /* ── number ── */
    if (/[0-9]/.test(raw[i]) && (i === 0 || /\W/.test(raw[i-1]))) {
      let j = i
      while (j < n && /[0-9._]/.test(raw[j])) j++
      html += span(C.number, raw.slice(i, j))
      i     = j
      continue
    }

    /* ── identifier or keyword ── */
    if (/[A-Za-z_$]/.test(raw[i])) {
      let j = i
      while (j < n && /[A-Za-z0-9_$]/.test(raw[j])) j++
      const word = raw.slice(i, j)
      // peek ahead — is the next non-space char `(`?
      let k = j
      while (k < n && raw[k] === ' ') k++
      const isFnCall = raw[k] === '('

      if (JS_KEYWORDS.has(word)) {
        html += span(C.keyword, word)
      } else if (/^[A-Z]/.test(word)) {
        // Capitalised = type / component
        html += span(C.type, word)
      } else if (isFnCall) {
        html += span(C.fn, word)
      } else {
        html += span(C.plain, word)
      }
      i = j
      continue
    }

    /* ── punctuation / operator ── */
    const ch = raw[i]
    if (['=>','&&','||','??','!=','===','!==','>=','<='].some(op => raw.startsWith(op, i))) {
      const op = ['=>','&&','||','??','!=','===','!==','>=','<='].find(op => raw.startsWith(op, i))!
      html += span(C.operator, op)
      i    += op.length
      continue
    }
    html += esc(ch)
    i++
  }

  return { html, nextState: { inBlockComment: inBC, inTemplateLit: inTmpl } }
}

/* ── find full path in tree ── */
function findPath(nodes: FileNode[], targetId: string, prefix = ''): string | null {
  for (const n of nodes) {
    const p = prefix ? `${prefix}/${n.name}` : n.name
    if (n.id === targetId) return p
    if (n.type === 'folder') {
      const r = findPath(n.children, targetId, p)
      if (r) return r
    }
  }
  return null
}

/* ── file-type colour dot ── */
function dotColor(ext: string): string {
  switch (ext) {
    case 'tsx': case 'ts': return '#60a5fa'
    case 'jsx': case 'js': return '#f59e0b'
    case 'css': return '#a78bfa'
    case 'html': return '#f87171'
    case 'json': return '#34d399'
    default: return '#94a3b8'
  }
}

/* ─────────────────────────────────────────────── */
export const CodeViewer: React.FC<CodeViewerProps> = ({
  tree, setTree, activeFileId, setActiveFileId, effectiveFileContents,
}) => {
  const [copied, setCopied] = useState(false)

  const toggleFolder = useCallback((id: string) => {
    const toggle = (nodes: FileNode[]): FileNode[] =>
      nodes.map(n =>
        n.type === 'folder'
          ? n.id === id ? { ...n, open: !n.open } : { ...n, children: toggle(n.children) }
          : n
      )
    setTree(toggle(tree))
  }, [tree, setTree])

  const activeContent = useMemo(() => {
    const f = activeFileId ? effectiveFileContents.get(activeFileId) : null
    return f?.content ?? ''
  }, [activeFileId, effectiveFileContents])

  const activePath = useMemo(() =>
    (activeFileId ? findPath(tree, activeFileId) : null) ?? 'Select a file',
    [tree, activeFileId])

  const ext = activePath.split('.').pop()?.toLowerCase() ?? ''

  const lines = useMemo((): Array<{ num: number; html: string }> => {
    if (!activeContent) return []
    const raw = activeContent.split('\n')
    let state: LineState = { inBlockComment: false, inTemplateLit: false }
    return raw.map((line, idx) => {
      const { html, nextState } = highlightLine(line, ext, state)
      state = nextState
      return { num: idx + 1, html }
    })
  }, [activeContent, ext])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* */ }
  }

  return (
    <div style={{
      background: '#1e1e2e', borderRadius: 16, overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,.45)',
      display: 'flex', flexDirection: 'column', height: '100%',
    }}>
      {/* ── Header ── */}
      <div style={{
        background: '#181825', padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid rgba(255,255,255,.06)', flexShrink: 0,
      }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: dotColor(ext), flexShrink: 0, display: 'inline-block' }}/>
        <span style={{ color: '#94a3b8', fontSize: 12, fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {activePath}
        </span>
        <button onClick={handleCopy}
          style={{
            padding: '4px 12px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,.2)',
            background: copied ? 'rgba(80,250,123,.12)' : 'rgba(255,255,255,.06)',
            color: copied ? '#50fa7b' : '#f8f8f2',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
            whiteSpace: 'nowrap', transition: 'all .2s', flexShrink: 0,
          }}>
          {copied ? '✓ Copied!' : 'Copy Code'}
        </button>
      </div>

      {/* ── Code area ── */}
      {activeContent ? (
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 0' }} className="custom-scrollbar">
          <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
            <tbody>
              {lines.map(({ num, html }) => (
                <tr key={num} style={{ lineHeight: '22px' }}>
                  <td style={{
                    width: 48, paddingRight: 20, paddingLeft: 16,
                    textAlign: 'right', verticalAlign: 'top',
                    color: '#4b5563', fontSize: 12, fontFamily: 'monospace',
                    userSelect: 'none', flexShrink: 0, whiteSpace: 'nowrap',
                  }}>
                    {num}
                  </td>
                  <td style={{
                    paddingRight: 24, fontSize: 13, fontFamily: "'JetBrains Mono','Fira Code','Consolas',monospace",
                    whiteSpace: 'pre', color: C.plain,
                  }}
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#4b5563', fontSize: 13 }}>Select a file to view its contents</p>
        </div>
      )}
    </div>
  )
}
