import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import logoImg from './assets/image-Photoroom.png'

const API_URL = 'http://localhost:5001'

/**
 * DiagramChatPopup — floating AI assistant that appears after pipeline completes.
 * Shows a pulsing logo notification; clicking it opens a mini chat window
 * integrated with the backend diagram_chat + report refinement endpoints.
 *
 * Tabs:
 *   1. Chat – conversational AI for diagram/report refinement
 *   2. Requirements – interactive Q&A to build a requirements specification
 *   3. Project Specification – generate a PDF specification document
 *
 * The Requirements tab implements a connected 3-phase workflow:
 *   Phase 1 (Q&A) → Phase 2 (generating spec) → Phase 3 (completion + transition)
 */
export default function DiagramChatPopup({ socket, pipelineResults, visible, startOnTab, onTabActivated }) {
  // ─── General popup state ──────────────────────────────────────────────────
  const [open, setOpen] = useState(false)
  const [showNotif, setShowNotif] = useState(true)
  const [activeTab, setActiveTab] = useState('chat') // 'chat' | 'requirements' | 'specification'

  // ─── Chat tab state ───────────────────────────────────────────────────────
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [aiTyping, setAiTyping] = useState(false)
  const [chatStarted, setChatStarted] = useState(false)
  const [mermaidCode, setMermaidCode] = useState(null)
  const [renderedImage, setRenderedImage] = useState(null)
  const [chatError, setChatError] = useState(null)

  // ─── Specification tab state ──────────────────────────────────────────────
  const [specGenerating, setSpecGenerating] = useState(false)
  const [specReady, setSpecReady] = useState(null)
  const [specError, setSpecError] = useState(null)

  // ─── Requirements tab state (3-phase workflow) ────────────────────────────
  const [reqSessionActive, setReqSessionActive] = useState(false)
  const [reqCurrentQuestion, setReqCurrentQuestion] = useState(null)
  const [reqProgress, setReqProgress] = useState({ current: 0, total: 0 })
  const [reqAnswers, setReqAnswers] = useState({})
  const [reqCustomAnswer, setReqCustomAnswer] = useState('')
  const [reqIsLoading, setReqIsLoading] = useState(false)
  const [reqCompleted, setReqCompleted] = useState(null) // completion data
  const [reqError, setReqError] = useState(null)
  const [reqStarted, setReqStarted] = useState(false) // have we ever started a session?

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const sendTimeoutRef = useRef(null)
  const reqInputRef = useRef(null)

  // ═══════════════════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════

  // Scroll to latest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Focus input when popup opens
  useEffect(() => {
    if (open && activeTab === 'chat' && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [open, activeTab])

  // Handle startOnTab prop — open popup on specific tab
  useEffect(() => {
    if (startOnTab && visible) {
      setOpen(true)
      setShowNotif(false)
      setActiveTab(startOnTab)
      if (onTabActivated) onTabActivated()
    }
  }, [startOnTab, visible, onTabActivated])

  // Reset state when pipeline results change (new analysis)
  useEffect(() => {
    if (pipelineResults) {
      setChatStarted(false)
      setMessages([])
      setMermaidCode(null)
      setRenderedImage(null)
      setChatError(null)
      setShowNotif(true)
      setSending(false)
      setAiTyping(false)
      setSpecGenerating(false)
      setSpecReady(null)
      setSpecError(null)
      // Reset requirements state
      setReqSessionActive(false)
      setReqCurrentQuestion(null)
      setReqProgress({ current: 0, total: 0 })
      setReqAnswers({})
      setReqCustomAnswer('')
      setReqIsLoading(false)
      setReqCompleted(null)
      setReqError(null)
      setReqStarted(false)
      if (sendTimeoutRef.current) clearTimeout(sendTimeoutRef.current)
    }
  }, [pipelineResults])

  // ═══════════════════════════════════════════════════════════════════════════
  // SOCKET LISTENERS
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!socket) return

    // ── Chat listeners ──
    const onChatStarted = () => {
      setChatStarted(true)
      setAiTyping(true)
    }

    const onChatMessage = (data) => {
      if (data.role === 'user') return
      setSending(false)
      setAiTyping(false)
      if (sendTimeoutRef.current) clearTimeout(sendTimeoutRef.current)
      setMessages(prev => [...prev, {
        role: data.role,
        content: data.content,
        timestamp: data.timestamp || Date.now() / 1000,
      }])
    }

    const onMermaidUpdate = (data) => setMermaidCode(data.mermaid_code)

    const onDiagramRendered = (data) => {
      setRenderedImage(data.image_url)
      setMessages(prev => [...prev, {
        role: 'system',
        content: 'Diagram rendered successfully.',
        imageUrl: data.image_url,
        timestamp: Date.now() / 1000,
      }])
    }

    const onChatError = (data) => {
      setSending(false)
      setAiTyping(false)
      if (sendTimeoutRef.current) clearTimeout(sendTimeoutRef.current)
      setChatError(data.message)
      setTimeout(() => setChatError(null), 6000)
    }

    const onChatAck = () => setAiTyping(true)

    // ── Specification listeners ──
    const onSpecProgress = () => {
      setSpecGenerating(true)
      setSpecError(null)
    }
    const onSpecCompleted = (data) => {
      setSpecGenerating(false)
      setSpecReady({ filename: data.filename, download_url: data.download_url })
    }
    const onSpecPdfError = (data) => {
      setSpecGenerating(false)
      setSpecError(data.message)
      setTimeout(() => setSpecError(null), 8000)
    }

    // ── Requirements spec listeners ──
    const onReqSessionStarted = (data) => {
      setReqSessionActive(true)
      setReqStarted(true)
      setReqProgress({ current: 0, total: data.total_questions })
      setReqIsLoading(true)
    }

    const onReqQuestion = (data) => {
      setReqCurrentQuestion(data)
      setReqProgress(data.progress)
      setReqCustomAnswer('')
      setReqIsLoading(false)
    }

    const onReqAnswerRecorded = (data) => {
      setReqAnswers(prev => ({ ...prev, [data.question_id]: data.answer }))
      setReqIsLoading(true)
    }

    const onReqCompleted = (data) => {
      setReqIsLoading(false)
      setReqCurrentQuestion(null)
      setReqCompleted(data)

      // Auto-transition: after a brief pause so user sees the completion,
      // inject spec into AI chat context and auto-generate PDF
      setTimeout(() => {
        // 1) Inject spec content into the AI chat session
        if (socket && data?.spec_content) {
          socket.emit('inject_spec_context', { spec_content: data.spec_content })
        }

        // 2) Auto-generate the Specification PDF with spec data merged in
        if (socket && pipelineResults) {
          const enrichedResults = {
            ...pipelineResults,
            requirements_spec: {
              spec_content: data?.spec_content || '',
              answers_summary: data?.answers_summary || {},
              total_answered: data?.total_answered || 0,
            },
          }
          socket.emit('generate_specification', { pipeline_results: enrichedResults })
          setSpecGenerating(true)
          setSpecReady(null)
          setSpecError(null)
        }
      }, 2000)
    }

    const onReqError = (data) => {
      setReqError(data.message)
      setReqIsLoading(false)
      setTimeout(() => setReqError(null), 8000)
    }

    // Register all listeners
    socket.on('diagram_chat_started', onChatStarted)
    socket.on('diagram_chat_message', onChatMessage)
    socket.on('diagram_mermaid_update', onMermaidUpdate)
    socket.on('diagram_rendered', onDiagramRendered)
    socket.on('diagram_chat_error', onChatError)
    socket.on('diagram_chat_ack', onChatAck)
    socket.on('specification_progress', onSpecProgress)
    socket.on('specification_completed', onSpecCompleted)
    socket.on('specification_error', onSpecPdfError)
    socket.on('spec_session_started', onReqSessionStarted)
    socket.on('spec_question', onReqQuestion)
    socket.on('spec_answer_recorded', onReqAnswerRecorded)
    socket.on('spec_completed', onReqCompleted)
    socket.on('spec_error', onReqError)

    return () => {
      socket.off('diagram_chat_started', onChatStarted)
      socket.off('diagram_chat_message', onChatMessage)
      socket.off('diagram_mermaid_update', onMermaidUpdate)
      socket.off('diagram_rendered', onDiagramRendered)
      socket.off('diagram_chat_error', onChatError)
      socket.off('diagram_chat_ack', onChatAck)
      socket.off('specification_progress', onSpecProgress)
      socket.off('specification_completed', onSpecCompleted)
      socket.off('specification_error', onSpecPdfError)
      socket.off('spec_session_started', onReqSessionStarted)
      socket.off('spec_question', onReqQuestion)
      socket.off('spec_answer_recorded', onReqAnswerRecorded)
      socket.off('spec_completed', onReqCompleted)
      socket.off('spec_error', onReqError)
    }
  }, [socket])

  // Auto-start requirements session when tab is activated and not yet started
  useEffect(() => {
    if (activeTab === 'requirements' && !reqStarted && !reqSessionActive && socket && pipelineResults) {
      startReqSession()
    }
  }, [activeTab, reqStarted, reqSessionActive, socket, pipelineResults])

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAT HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const buildReportContent = useCallback(() => {
    if (!pipelineResults) return ''
    const parts = []
    if (pipelineResults.summary?.summary) {
      parts.push(`## Meeting Summary\n${pipelineResults.summary.summary}`)
    }
    const fr = pipelineResults.requirements?.functional_requirements || []
    if (fr.length > 0) {
      parts.push(`## Functional Requirements\n${fr.map(r => `- [${r.id}] ${r.description} (${r.priority})`).join('\n')}`)
    }
    const nfr = pipelineResults.requirements?.non_functional_requirements || []
    if (nfr.length > 0) {
      parts.push(`## Non-Functional Requirements\n${nfr.map(r => `- [${r.id}] ${r.description}`).join('\n')}`)
    }
    if (pipelineResults.consultant_guidance?.client_intent_summary) {
      parts.push(`## Client Intent\n${pipelineResults.consultant_guidance.client_intent_summary}`)
    }
    if (pipelineResults.mermaid_code) {
      parts.push(`## Current Diagram\n\`\`\`mermaid\n${pipelineResults.mermaid_code}\n\`\`\``)
    }
    return parts.join('\n\n')
  }, [pipelineResults])

  const startChat = useCallback(() => {
    if (!socket || chatStarted) return
    const reportContent = buildReportContent()
    if (!reportContent) return
    setMessages([{
      role: 'system',
      content: 'Hi! I\'m your AI assistant. I can help you refine the analysis, modify diagrams, or answer questions about the generated report. What would you like to adjust?',
      timestamp: Date.now() / 1000,
    }])
    socket.emit('start_diagram_chat', { report_content: reportContent })
  }, [socket, chatStarted, buildReportContent])

  const handleOpen = () => {
    setOpen(true)
    setShowNotif(false)
    if (!chatStarted) startChat()
  }

  const sendMessage = useCallback(() => {
    if (!socket || !input.trim() || sending) return
    const msg = input.trim()
    setInput('')
    setSending(true)
    setAiTyping(true)
    setMessages(prev => [...prev, {
      role: 'user',
      content: msg,
      timestamp: Date.now() / 1000,
    }])
    socket.emit('send_diagram_message', { message: msg })
    if (sendTimeoutRef.current) clearTimeout(sendTimeoutRef.current)
    sendTimeoutRef.current = setTimeout(() => {
      setSending(false)
      setAiTyping(false)
      setChatError('Response timed out. Try sending again.')
      setTimeout(() => setChatError(null), 5000)
    }, 120000)
  }, [socket, input, sending])

  const handleRender = useCallback(() => {
    if (!socket || !mermaidCode) return
    socket.emit('render_diagram', { format: 'png' })
  }, [socket, mermaidCode])

  const generateSpecification = useCallback(() => {
    if (!socket || !pipelineResults || specGenerating) return
    setSpecGenerating(true)
    setSpecReady(null)
    setSpecError(null)

    // Merge requirements spec Q&A data into pipeline results for PDF generation
    const enrichedResults = reqCompleted
      ? {
        ...pipelineResults,
        requirements_spec: {
          spec_content: reqCompleted.spec_content || '',
          answers_summary: reqCompleted.answers_summary || {},
          total_answered: reqCompleted.total_answered || 0,
        },
      }
      : pipelineResults

    socket.emit('generate_specification', { pipeline_results: enrichedResults })
  }, [socket, pipelineResults, specGenerating, reqCompleted])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const renderContent = (content) => {
    if (!content) return null
    const parts = content.split(/(```mermaid[\s\S]*?```)/g)
    return parts.map((part, i) => {
      const mermaidMatch = part.match(/```mermaid\s*\n([\s\S]*?)```/)
      if (mermaidMatch) {
        return (
          <pre key={i} className="dc-code-block">
            <div className="dc-code-label">Mermaid</div>
            {mermaidMatch[1].trim()}
          </pre>
        )
      }
      return part.split('\n').map((line, j) => (
        line.trim() ? <p key={`${i}-${j}`} className="dc-msg-line">{line}</p> : null
      ))
    })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REQUIREMENTS TAB HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const startReqSession = useCallback(() => {
    if (!socket || !pipelineResults || reqStarted) return
    setReqIsLoading(true)
    setReqError(null)
    socket.emit('start_requirements_spec', { report_content: JSON.stringify(pipelineResults) })
  }, [socket, pipelineResults, reqStarted])

  const handleReqSuggestionClick = (suggestion) => {
    if (reqIsLoading) return
    const match = suggestion.match(/^(\d+)\./)
    const answer = match ? match[1] : suggestion
    socket.emit('send_spec_answer', {
      answer,
      suggestions: reqCurrentQuestion.suggestions
    })
    setReqIsLoading(true)
  }

  const handleReqCustomSubmit = () => {
    if (!reqCustomAnswer.trim() || reqIsLoading) return
    socket.emit('send_spec_answer', {
      answer: reqCustomAnswer.trim(),
      suggestions: reqCurrentQuestion.suggestions
    })
    setReqIsLoading(true)
  }

  const handleReqSkip = () => {
    if (reqIsLoading) return
    socket.emit('skip_spec_question', {})
    setReqIsLoading(true)
  }

  const handleReqKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleReqCustomSubmit()
    }
  }

  const getCategoryIcon = (category) => {
    const icons = {
      functional: '⚙️',
      non_functional: '🛡️',
      technical: '💻',
      timeline: '📅',
      general: '📋'
    }
    return icons[category] || '📋'
  }

  const getPriorityColor = (priority) => {
    const colors = {
      must_ask: 'var(--danger)',
      should_ask: 'var(--gold)',
      nice_to_ask: '#10b981'
    }
    return colors[priority] || 'var(--text-muted)'
  }

  // Transition: Spec completed → inject context into chat → switch to Chat tab
  const handleContinueToChat = () => {
    if (reqCompleted) {
      const answeredCount = reqCompleted.total_answered || Object.keys(reqCompleted.answers_summary || {}).length

      // Inject a rich system message summarising the spec
      setMessages(prev => [...prev, {
        role: 'system',
        content: `📋 Requirements Specification complete! ${answeredCount} questions answered. The full spec has been generated and merged into the project specification PDF. You can now ask me to refine specific requirements, update diagrams, or explore any aspect of the specification.`,
        timestamp: Date.now() / 1000,
      }])

      // Send full spec content to AI chat backend so it has context
      if (socket && reqCompleted.spec_content) {
        socket.emit('inject_spec_context', { spec_content: reqCompleted.spec_content })
      }
    }
    setActiveTab('chat')
    if (!chatStarted) startChat()
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  if (!visible) return null

  return (
    <>
      {/* ── Notification Bubble ── */}
      <AnimatePresence>
        {!open && (
          <motion.div
            className="ai-popup"
            initial={{ opacity: 0, scale: 0.4, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.4, y: 40 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.3 }}
          >
            <motion.div
              className="ai-popup-ring"
              animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="ai-popup-ring ai-popup-ring--outer"
              animate={{ scale: [1, 1.35, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
            />
            <motion.button
              className="ai-popup-btn"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              onClick={handleOpen}
              title="Chat with AI about your analysis"
            >
              <img src={logoImg} alt="ScribeAI" className="ai-popup-logo" />
              {showNotif && <span className="ai-popup-badge" />}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Chat Popup Window ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="dc-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="dc-popup"
              initial={{ opacity: 0, scale: 0.85, y: 60 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 60 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            >
              {/* Header */}
              <div className="dc-header">
                <div className="dc-header-left">
                  <div className="dc-avatar">
                    <img src={logoImg} alt="AI" className="dc-avatar-img" />
                  </div>
                  <div className="dc-header-info">
                    <span className="dc-header-name">Scribe<span className="dc-accent">AI</span> Assistant</span>
                    <span className="dc-header-status">
                      <span className={`dc-status-dot ${aiTyping || reqIsLoading ? 'dc-status-dot--thinking' : ''}`} />
                      {aiTyping ? 'Thinking...' : reqIsLoading ? 'Processing...' : 'Online'}
                    </span>
                  </div>
                </div>
                <div className="dc-header-actions">
                  {mermaidCode && (
                    <button className="dc-btn-icon" onClick={handleRender} title="Render diagram">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </button>
                  )}
                  <button className="dc-btn-close" onClick={() => setOpen(false)} title="Minimize">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* ── Tabs ── */}
              <div className="dc-tabs">
                <button
                  className={`dc-tab ${activeTab === 'chat' ? 'dc-tab--active' : ''}`}
                  onClick={() => { setActiveTab('chat'); if (!chatStarted) startChat() }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  Chat
                </button>
                <button
                  className={`dc-tab ${activeTab === 'requirements' ? 'dc-tab--active' : ''}`}
                  onClick={() => setActiveTab('requirements')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 11l3 3L22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                  Requirements
                  {reqCompleted && <span className="dc-tab-badge">✓</span>}
                  {reqSessionActive && !reqCompleted && (
                    <span className="dc-tab-badge dc-tab-badge--active">{reqProgress.current}</span>
                  )}
                </button>
                <button
                  className={`dc-tab ${activeTab === 'specification' ? 'dc-tab--active' : ''}`}
                  onClick={() => setActiveTab('specification')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  Specification
                  {specReady && <span className="dc-tab-badge">✓</span>}
                </button>
              </div>

              {/* ════════════════════════════════════════════════════════════════
                  CHAT TAB
                  ════════════════════════════════════════════════════════════════ */}
              {activeTab === 'chat' && (
                <>
                  {/* Messages */}
                  <div className="dc-messages">
                    {messages.map((msg, i) => (
                      <motion.div
                        key={i}
                        className={`dc-msg dc-msg--${msg.role}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {msg.role === 'assistant' && (
                          <div className="dc-msg-avatar">
                            <img src={logoImg} alt="AI" />
                          </div>
                        )}
                        <div className={`dc-msg-bubble dc-bubble--${msg.role}`}>
                          {renderContent(msg.content)}
                          {msg.imageUrl && (
                            <a href={`${API_URL}${msg.imageUrl}`} target="_blank" rel="noreferrer" className="dc-rendered-img-link">
                              <img src={`${API_URL}${msg.imageUrl}`} alt="Rendered diagram" className="dc-rendered-img" />
                              <span className="dc-img-download">Open full size</span>
                            </a>
                          )}
                        </div>
                      </motion.div>
                    ))}

                    {/* Typing indicator */}
                    {aiTyping && (
                      <motion.div className="dc-msg dc-msg--assistant" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div className="dc-msg-avatar">
                          <img src={logoImg} alt="AI" />
                        </div>
                        <div className="dc-msg-bubble dc-bubble--assistant">
                          <div className="dc-typing"><span /><span /><span /></div>
                        </div>
                      </motion.div>
                    )}

                    {chatError && (
                      <motion.div className="dc-error" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        {chatError}
                      </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Quick suggestions */}
                  {messages.length <= 2 && (
                    <div className="dc-suggestions">
                      {[
                        'Can you modify the diagram to show more detail?',
                        'Are there any missing requirements?',
                        'Can you suggest improvements to the architecture?',
                        'Can you regenerate the report with changes?',
                      ].map((s, i) => (
                        <button key={i} className="dc-suggestion" onClick={() => { setInput(s); setTimeout(() => inputRef.current?.focus(), 50) }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Input */}
                  <div className="dc-input-bar">
                    <textarea
                      ref={inputRef}
                      className="dc-input"
                      placeholder="Ask about the report, request diagram changes..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      rows={1}
                      disabled={sending}
                    />
                    <button
                      className="dc-send-btn"
                      onClick={sendMessage}
                      disabled={!input.trim() || sending}
                      title="Send message"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </button>
                  </div>
                </>
              )}

              {/* ════════════════════════════════════════════════════════════════
                  REQUIREMENTS TAB — 3-Phase Workflow
                  ════════════════════════════════════════════════════════════════ */}
              {activeTab === 'requirements' && (
                <div className="dc-req-tab">
                  {/* ── Phase 3: Completion ── */}
                  {reqCompleted && (
                    <motion.div
                      className="dc-req-complete"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    >
                      <div className="dc-req-complete-header">
                        <div className="dc-req-complete-icon">
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                          </svg>
                        </div>
                        <h3 className="dc-req-complete-title">Requirements Spec Complete!</h3>
                        <p className="dc-req-complete-subtitle">
                          {reqCompleted.total_answered || Object.keys(reqCompleted.answers_summary || {}).length} questions answered
                        </p>
                      </div>

                      {/* Answer Summary */}
                      {reqCompleted.answers_summary && Object.keys(reqCompleted.answers_summary).length > 0 && (
                        <div className="dc-req-summary-section">
                          <span className="dc-req-summary-label">Answers Summary</span>
                          <div className="dc-req-summary-list">
                            {Object.entries(reqCompleted.answers_summary).map(([qId, answer]) => (
                              <div key={qId} className="dc-req-summary-item">
                                <span className="dc-req-summary-qid">{qId}</span>
                                <span className="dc-req-summary-answer">
                                  {answer === '[Skipped]' ? (
                                    <em className="dc-req-skipped">Skipped</em>
                                  ) : (
                                    answer.length > 80 ? answer.substring(0, 80) + '…' : answer
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Spec Preview */}
                      {reqCompleted.spec_content && (
                        <div className="dc-req-spec-preview">
                          <span className="dc-req-summary-label">Generated Specification</span>
                          <div className="dc-req-spec-content">
                            {reqCompleted.spec_content.substring(0, 500)}
                            {reqCompleted.spec_content.length > 500 && '...'}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="dc-req-complete-actions">
                        <motion.button
                          className="dc-req-continue-btn"
                          onClick={handleContinueToChat}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                          Continue to Chat
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </motion.button>
                        <button
                          className="dc-req-spec-tab-btn"
                          onClick={() => setActiveTab('specification')}
                        >
                          Generate PDF Specification →
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* ── Phase 2: Loading / Generating ── */}
                  {!reqCompleted && reqIsLoading && !reqCurrentQuestion && (
                    <div className="dc-req-loading">
                      <motion.div
                        className="dc-req-spinner"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      />
                      <p className="dc-req-loading-text">
                        {reqSessionActive
                          ? reqProgress.current >= reqProgress.total && reqProgress.total > 0
                            ? 'Generating your requirements specification...'
                            : 'Preparing next question...'
                          : 'Starting requirements session...'}
                      </p>
                      <p className="dc-req-loading-sub">
                        AI is analyzing your project to provide tailored suggestions
                      </p>
                    </div>
                  )}

                  {/* ── Phase 1: Q&A ── */}
                  {!reqCompleted && reqCurrentQuestion && (
                    <motion.div
                      className="dc-req-qa"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {/* Progress Bar */}
                      {reqProgress.total > 0 && (
                        <div className="dc-req-progress">
                          <div className="dc-req-progress-info">
                            <span className="dc-req-progress-text">
                              Question {reqProgress.current} of {reqProgress.total}
                            </span>
                            <span className="dc-req-progress-percent">
                              {Math.round((reqProgress.current / reqProgress.total) * 100)}%
                            </span>
                          </div>
                          <div className="dc-req-progress-track">
                            <motion.div
                              className="dc-req-progress-fill"
                              initial={{ width: 0 }}
                              animate={{ width: `${(reqProgress.current / reqProgress.total) * 100}%` }}
                              transition={{ duration: 0.5, ease: 'easeOut' }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Question Card */}
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={reqCurrentQuestion.question_id}
                          className="dc-req-question-card"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.3 }}
                        >
                          {/* Meta row */}
                          <div className="dc-req-question-meta">
                            <span className="dc-req-category">
                              {getCategoryIcon(reqCurrentQuestion.category)}
                              {' '}
                              {(reqCurrentQuestion.category || '').replace(/_/g, ' ')}
                            </span>
                            <span
                              className="dc-req-priority"
                              style={{ color: getPriorityColor(reqCurrentQuestion.priority) }}
                            >
                              {(reqCurrentQuestion.priority || '').replace(/_/g, ' ')}
                            </span>
                          </div>

                          {/* Question text */}
                          <p className="dc-req-question-text">
                            {reqCurrentQuestion.question}
                          </p>

                          {/* Context */}
                          {reqCurrentQuestion.context && (
                            <div className="dc-req-context">
                              <span className="dc-req-context-icon">💡</span>
                              <span className="dc-req-context-text">{reqCurrentQuestion.context}</span>
                            </div>
                          )}

                          {/* Suggestions */}
                          <div className="dc-req-suggestions">
                            {reqCurrentQuestion.suggestions?.map((suggestion, index) => {
                              const isOther = suggestion.toLowerCase().includes('other')
                              return (
                                <motion.button
                                  key={index}
                                  className={`dc-req-suggestion-btn ${isOther ? 'dc-req-suggestion--other' : ''}`}
                                  onClick={() => handleReqSuggestionClick(suggestion)}
                                  disabled={reqIsLoading}
                                  whileHover={{ scale: 1.01, x: 3 }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  {suggestion}
                                </motion.button>
                              )
                            })}
                          </div>

                          {/* Custom answer */}
                          <div className="dc-req-custom">
                            <span className="dc-req-custom-label">Or type your own:</span>
                            <div className="dc-req-custom-row">
                              <input
                                ref={reqInputRef}
                                type="text"
                                className="dc-req-custom-input"
                                value={reqCustomAnswer}
                                onChange={(e) => setReqCustomAnswer(e.target.value)}
                                onKeyDown={handleReqKeyDown}
                                placeholder="Your answer..."
                                disabled={reqIsLoading}
                              />
                              <button
                                className="dc-req-custom-submit"
                                onClick={handleReqCustomSubmit}
                                disabled={!reqCustomAnswer.trim() || reqIsLoading}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="22" y1="2" x2="11" y2="13" />
                                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          {/* Skip */}
                          <div className="dc-req-actions">
                            <button
                              className="dc-req-skip-btn"
                              onClick={handleReqSkip}
                              disabled={reqIsLoading}
                            >
                              Skip →
                            </button>
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    </motion.div>
                  )}

                  {/* ── Not started yet (shouldn't normally show; auto-start triggers) ── */}
                  {!reqCompleted && !reqCurrentQuestion && !reqIsLoading && !reqStarted && (
                    <div className="dc-req-start">
                      <div className="dc-req-start-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 11l3 3L22 4" />
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                        </svg>
                      </div>
                      <h3 className="dc-req-start-title">Build Requirements Specification</h3>
                      <p className="dc-req-start-desc">
                        Answer clarification questions to refine and complete your project requirements.
                        The AI will generate tailored suggestions for each question.
                      </p>
                      <button className="dc-req-start-btn" onClick={startReqSession}>
                        Start Requirements Q&A
                      </button>
                    </div>
                  )}

                  {/* Error */}
                  <AnimatePresence>
                    {reqError && (
                      <motion.div
                        className="dc-req-error"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                      >
                        <span>⚠️</span> {reqError}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* ════════════════════════════════════════════════════════════════
                  SPECIFICATION TAB
                  ════════════════════════════════════════════════════════════════ */}
              {activeTab === 'specification' && (
                <div className="dc-spec-tab">
                  <div className="dc-spec-content">
                    {/* Header illustration */}
                    <div className="dc-spec-hero">
                      <div className="dc-spec-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                          <polyline points="10 9 9 9 8 9" />
                        </svg>
                      </div>
                      <h3 className="dc-spec-title">Project Specification</h3>
                      <p className="dc-spec-desc">
                        Generate a comprehensive, client-ready PDF document that consolidates
                        the full analysis — requirements, architecture, diagrams, risks, and
                        next steps — into a single professional specification.
                      </p>
                    </div>

                    {/* What's included */}
                    <div className="dc-spec-includes">
                      <span className="dc-spec-includes-label">Includes:</span>
                      <div className="dc-spec-tags">
                        {[
                          'Executive Summary',
                          'Functional Requirements',
                          'Non-Functional Requirements',
                          'System Architecture',
                          'Data Model & API Design',
                          'Technology Stack',
                          'Requirements Specification',
                          'Risk Assessment',
                          'Open Items & Next Steps',
                          'Diagrams Appendix',
                        ].map((tag) => (
                          <span key={tag} className="dc-spec-tag">{tag}</span>
                        ))}
                      </div>
                    </div>

                    {/* Generate / Download */}
                    <div className="dc-spec-actions">
                      {!specReady && !specGenerating && (
                        <button
                          className="dc-spec-generate-btn"
                          onClick={generateSpecification}
                          disabled={!pipelineResults}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          Generate Specification PDF
                        </button>
                      )}

                      {specGenerating && (
                        <div className="dc-spec-loading">
                          <div className="dc-spec-spinner" />
                          <span>Generating your specification document...</span>
                          <p className="dc-spec-loading-sub">
                            Building cover page, requirements tables, architecture diagrams,
                            risk assessment, and appendix...
                          </p>
                        </div>
                      )}

                      {specReady && (
                        <motion.div
                          className="dc-spec-ready"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        >
                          <div className="dc-spec-ready-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                              <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                          </div>
                          <p className="dc-spec-ready-text">Your Project Specification is ready!</p>
                          <a
                            href={`${API_URL}${specReady.download_url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="dc-spec-download-btn"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Download PDF
                          </a>
                          <button className="dc-spec-regen-btn" onClick={generateSpecification}>
                            Regenerate
                          </button>
                        </motion.div>
                      )}

                      {specError && (
                        <motion.div className="dc-spec-error" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                          {specError}
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
