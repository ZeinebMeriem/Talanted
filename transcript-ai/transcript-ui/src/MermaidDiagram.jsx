import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

// Initialize mermaid with a dark theme matching the app
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#b45309',
    primaryTextColor: '#fef3c7',
    primaryBorderColor: '#d97706',
    lineColor: '#d97706',
    secondaryColor: '#451a03',
    tertiaryColor: '#78350f',
    background: '#1c1917',
    mainBkg: '#292524',
    secondBkg: '#1c1917',
    noteTextColor: '#fef3c7',
    noteBkgColor: '#451a03',
    noteBorderColor: '#d97706',
    actorTextColor: '#fef3c7',
    actorBkg: '#451a03',
    actorBorder: '#d97706',
    actorLineColor: '#d97706',
    signalColor: '#fef3c7',
    signalTextColor: '#fef3c7',
    labelBoxBkgColor: '#451a03',
    labelBoxBorderColor: '#d97706',
    labelTextColor: '#fef3c7',
    loopTextColor: '#fef3c7',
    activationBorderColor: '#d97706',
    activationBkgColor: '#78350f',
    sequenceNumberColor: '#fef3c7',
    fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
    fontSize: '14px',
  },
  sequence: {
    actorMargin: 80,
    width: 180,
    height: 50,
    boxMargin: 10,
    boxTextMargin: 8,
    noteMargin: 10,
    messageMargin: 40,
    mirrorActors: true,
    useMaxWidth: true,
  },
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis',
  },
})

let diagramIdCounter = 0

export default function MermaidDiagram({ code }) {
  const containerRef = useRef(null)
  const [error, setError] = useState(null)
  const [showCode, setShowCode] = useState(false)

  useEffect(() => {
    if (!code || !containerRef.current) return

    const renderDiagram = async () => {
      try {
        setError(null)
        const id = `mermaid-diagram-${++diagramIdCounter}`
        containerRef.current.innerHTML = ''

        const { svg } = await mermaid.render(id, code)
        if (containerRef.current) {
          containerRef.current.innerHTML = svg

          // Make the SVG responsive
          const svgEl = containerRef.current.querySelector('svg')
          if (svgEl) {
            svgEl.style.maxWidth = '100%'
            svgEl.style.height = 'auto'
            svgEl.style.borderRadius = '8px'
          }
        }
      } catch (err) {
        console.warn('Mermaid render error:', err)
        setError(err.message || 'Failed to render diagram')
        // Clean up any error elements mermaid might have injected
        const errorEl = document.getElementById(`d${diagramIdCounter}`)
        if (errorEl) errorEl.remove()
      }
    }

    renderDiagram()
  }, [code])

  return (
    <div className="mermaid-diagram-wrapper">
      {error ? (
        <>
          <div className="mermaid-error">
            <span>⚠️</span> Could not render diagram — showing source code
          </div>
          <pre className="code-block">{code}</pre>
        </>
      ) : (
        <div ref={containerRef} className="mermaid-rendered" />
      )}

      <button
        className="mermaid-toggle-code"
        onClick={() => setShowCode(v => !v)}
      >
        {showCode ? '🔽 Hide source code' : '📝 Show source code'}
      </button>

      {showCode && <pre className="code-block mermaid-source">{code}</pre>}
    </div>
  )
}
