import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { io } from 'socket.io-client'
import './App.css'
import logoImg from './assets/image-Photoroom.png'
import DiagramChatPopup from './DiagramChatPopup'
import MermaidDiagram from './MermaidDiagram'


const API_URL = 'http://localhost:5001'
const PIPELINE_DOWNLOAD = `${API_URL}/api/reports`

const LANGUAGES = [
  { code: null, label: 'Auto', icon: '🌐', desc: 'Auto-detect' },
  { code: 'en', label: 'EN', icon: '🇬🇧', desc: 'English' },
  { code: 'fr', label: 'FR', icon: '🇫🇷', desc: 'French' },
  { code: 'ar', label: 'AR', icon: '🇹🇳', desc: 'Arabic / Tunisian' },
]

const SPEAKER_COLORS = [
  { bg: 'rgba(222, 158, 72, 0.10)', border: '#DE9E48', label: '#f0c97a', dot: '#DE9E48' },
  { bg: 'rgba(122, 67, 29, 0.12)', border: '#7A431D', label: '#c07a3a', dot: '#7A431D' },
  { bg: 'rgba(92, 184, 112, 0.10)', border: '#5cb870', label: '#8fd4a0', dot: '#5cb870' },
  { bg: 'rgba(86, 55, 39, 0.14)', border: '#563727', label: '#a07058', dot: '#563727' },
  { bg: 'rgba(210, 95, 95, 0.10)', border: '#d25f5f', label: '#e88', dot: '#d25f5f' },
  { bg: 'rgba(196, 164, 122, 0.12)', border: '#c4a47a', label: '#e0c9a8', dot: '#c4a47a' },
]

function getSpeakerInfo(speakerId) {
  const match = speakerId?.match(/(\d+)/)
  const index = match ? parseInt(match[1]) : 0
  const colors = SPEAKER_COLORS[index % SPEAKER_COLORS.length]
  return { ...colors, name: `Speaker ${index + 1}`, index }
}

/* ── Decorative arc lines (inspired by reference image) ── */
function GoldenArcs() {
  return (
    <div className="golden-arcs" aria-hidden="true">
      <svg viewBox="0 0 800 800" className="arc-svg arc-svg--right">
        <defs>
          <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#DE9E48" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#DE9E48" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#7A431D" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[260, 300, 340, 380, 420, 460, 500, 540].map((r, i) => (
          <circle
            key={i}
            cx="800" cy="400" r={r}
            fill="none"
            stroke="url(#arcGrad)"
            strokeWidth={1.2 - i * 0.1}
            opacity={0.35 - i * 0.03}
          />
        ))}
      </svg>
    </div>
  )
}

/* ── Circular waveform around record button ── */
function CircularWaveform({ isActive }) {
  const segments = 48
  return (
    <div className="circular-wave">
      {Array.from({ length: segments }).map((_, i) => {
        const angle = (i / segments) * 360
        return (
          <motion.div
            key={i}
            className="wave-tick"
            style={{
              transform: `rotate(${angle}deg) translateY(-72px)`,
            }}
            animate={isActive ? {
              scaleY: [0.5, 1.2 + Math.random() * 1.5, 0.5],
              opacity: [0.3, 0.8, 0.3],
            } : { scaleY: 0.4, opacity: 0.15 }}
            transition={isActive ? {
              duration: 0.35 + Math.random() * 0.3,
              repeat: Infinity,
              repeatType: 'reverse',
              delay: i * 0.015,
              ease: 'easeInOut',
            } : { duration: 0.5 }}
          />
        )
      })}
    </div>
  )
}

function App() {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcription, setTranscription] = useState('')
  const [streamingText, setStreamingText] = useState('')
  const [error, setError] = useState(null)
  const [duration, setDuration] = useState(0)
  const [detectedLanguage, setDetectedLanguage] = useState(null)
  const [languageConfidence, setLanguageConfidence] = useState(null)
  const [selectedLanguage, setSelectedLanguage] = useState(null)
  const [chunkCount, setChunkCount] = useState(0)
  const [connected, setConnected] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [segments, setSegments] = useState([])
  const [pipelineRunning, setPipelineRunning] = useState(false)
  const [pipelineProgress, setPipelineProgress] = useState(null)
  const [pipelineResults, setPipelineResults] = useState(null)
  const [pipelineError, setPipelineError] = useState(null)
  const [diagramChatInitialTab, setDiagramChatInitialTab] = useState(null)
  const socketRef = useRef(null)
  const transcriptionEndRef = useRef(null)
  const pipelineEndRef = useRef(null)

  useEffect(() => {
    if (transcriptionEndRef.current) {
      transcriptionEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [streamingText, transcription])

  useEffect(() => {
    if (pipelineEndRef.current) {
      pipelineEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [pipelineResults, pipelineProgress])

  useEffect(() => {
    socketRef.current = io(API_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
    })

    socketRef.current.on('connect', () => setConnected(true))
    socketRef.current.on('connected', () => setConnected(true))
    socketRef.current.on('disconnect', () => setConnected(false))
    socketRef.current.on('recording_started', () => { setIsRecording(true); setChunkCount(0) })

    socketRef.current.on('transcription_update', (data) => {
      setStreamingText(data.full_text)
      if (data.segments) setSegments(data.segments)
      setDetectedLanguage(data.language)
      setLanguageConfidence(data.language_confidence)
      setChunkCount(data.chunk_number || 0)
      setWordCount(data.full_text ? data.full_text.split(/\s+/).filter(Boolean).length : 0)
    })

    socketRef.current.on('chunk_status', () => { })

    socketRef.current.on('recording_completed', (data) => {
      setIsRecording(false)
      setIsProcessing(false)
      setTranscription(data.full_transcription)
      setStreamingText('')
      if (data.segments) setSegments(data.segments)
      if (data.detected_language) setDetectedLanguage(data.detected_language)
      setWordCount(data.word_count || 0)
    })

    socketRef.current.on('error', (data) => { setError(data.message); setIsRecording(false); setIsProcessing(false) })
    socketRef.current.on('pipeline_started', () => { setPipelineRunning(true); setPipelineProgress({ step: 0, total: 5, label: 'Starting AI pipeline...' }); setPipelineResults(null); setPipelineError(null) })
    socketRef.current.on('pipeline_progress', (data) => setPipelineProgress(data))
    socketRef.current.on('pipeline_completed', (data) => { setPipelineRunning(false); setPipelineProgress(null); setPipelineResults(data) })
    socketRef.current.on('pipeline_error', (data) => { setPipelineRunning(false); setPipelineProgress(null); setPipelineError(data.message) })

    return () => { if (socketRef.current) socketRef.current.disconnect() }
  }, [])

  useEffect(() => {
    let interval
    if (isRecording) {
      interval = setInterval(() => setDuration(prev => prev + 0.1), 100)
    } else {
      setDuration(0)
    }
    return () => clearInterval(interval)
  }, [isRecording])

  const startRecording = useCallback(() => {
    setError(null); setTranscription(''); setStreamingText(''); setSegments([])
    setDetectedLanguage(null); setLanguageConfidence(null); setChunkCount(0); setWordCount(0)
    setPipelineResults(null); setPipelineError(null); setPipelineProgress(null); setPipelineRunning(false)
    socketRef.current.emit('start_recording', { language: selectedLanguage })
  }, [selectedLanguage])

  const runPipeline = useCallback(() => {
    if (!transcription) return
    socketRef.current.emit('run_pipeline', { text: transcription })
  }, [transcription])

  const stopRecording = useCallback(() => { setIsProcessing(true); socketRef.current.emit('stop_recording') }, [])

  const handleRecordClick = () => { isRecording ? stopRecording() : startRecording() }

  const fmt = (secs) => { const m = Math.floor(secs / 60); const s = Math.floor(secs % 60); return `${m}:${s.toString().padStart(2, '0')}` }

  const langName = (code) => {
    const map = { eng: 'English', fra: 'French', ara: 'Arabic', en: 'English', fr: 'French', ar: 'Arabic', tn: 'Tunisian' }
    return map[code] || code || 'Unknown'
  }

  const currentDisplayText = streamingText || transcription
  const isRTL = currentDisplayText && /[\u0600-\u06FF]/.test(currentDisplayText)

  return (
    <div className="app">
      {/* ── Background ── */}
      <div className="bg-layer">
        <div className="bg-noise" />
        <GoldenArcs />
        <div className="bg-gradient" />
      </div>

      {/* ── Top Nav Bar ── */}
      <motion.nav
        className="topbar"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="topbar-brand">
          <div className="brand-mark">
            <img src={logoImg} alt="ScribeAI Logo" className="brand-logo" />
          </div>
          <span className="brand-name">Scribe<span className="brand-accent">AI</span></span>
        </div>

        <div className="topbar-center">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.label}
              className={`nav-lang ${selectedLanguage === lang.code ? 'active' : ''}`}
              onClick={() => setSelectedLanguage(lang.code)}
              disabled={isRecording}
              title={lang.desc}
            >
              <span className="nav-lang-icon">{lang.icon}</span>
              <span className="nav-lang-label">{lang.label}</span>
            </button>
          ))}
        </div>

        <div className="topbar-right">
          <div className={`status-indicator ${connected ? 'online' : 'offline'}`}>
            <span className="status-dot-nav" />
            <span className="status-text-nav">{connected ? 'Live' : 'Offline'}</span>
          </div>
        </div>
      </motion.nav>

      {/* ── Main Content ── */}
      <main className="main-content">

        {/* Hero / Record Zone */}
        <motion.section
          className="hero-zone"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >

          {/* Record Button Complex */}
          <div className="record-complex">
            <CircularWaveform isActive={isRecording} />

            <motion.button
              className={`record-btn ${isRecording ? 'is-recording' : ''} ${isProcessing ? 'is-processing' : ''}`}
              onClick={!isProcessing ? handleRecordClick : undefined}
              whileHover={!isProcessing ? { scale: 1.06 } : {}}
              whileTap={!isProcessing ? { scale: 0.93 } : {}}
              disabled={isProcessing || !connected}
            >
              <AnimatePresence>
                {isRecording && (
                  <>
                    <motion.div className="pulse-ring ring-a" initial={{ scale: 1, opacity: 0.5 }} animate={{ scale: 2.4, opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }} />
                    <motion.div className="pulse-ring ring-b" initial={{ scale: 1, opacity: 0.4 }} animate={{ scale: 2.4, opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.7 }} />
                  </>
                )}
              </AnimatePresence>

              <div className="btn-inner">
                {isProcessing ? (
                  <motion.div className="spin-ring" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                ) : isRecording ? (
                  <motion.div className="stop-square" initial={{ scale: 0, borderRadius: '50%' }} animate={{ scale: 1, borderRadius: '5px' }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} />
                ) : (
                  <motion.svg width="32" height="32" viewBox="0 0 24 24" fill="none" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
                    <path d="M12 14C13.66 14 15 12.66 15 11V5C15 3.34 13.66 2 12 2C10.34 2 9 3.34 9 5V11C9 12.66 10.34 14 12 14Z" fill="currentColor" />
                    <path d="M17 11C17 13.76 14.76 16 12 16C9.24 16 7 13.76 7 11H5C5 14.53 7.61 17.43 11 17.92V21H13V17.92C16.39 17.43 19 14.53 19 11H17Z" fill="currentColor" />
                  </motion.svg>
                )}
              </div>
            </motion.button>

            {/* Status Ring */}
            <AnimatePresence mode="wait">
              {isRecording ? (
                <motion.div className="rec-meta" key="rec" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <span className="rec-live-pip" />
                  <span className="rec-timer">{fmt(duration)}</span>
                  {chunkCount > 0 && <span className="rec-chunks">{chunkCount} chunks</span>}
                </motion.div>
              ) : isProcessing ? (
                <motion.div className="rec-meta processing-meta" key="proc" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  Finalizing...
                </motion.div>
              ) : !currentDisplayText ? (
                <motion.div className="rec-meta idle-meta" key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  Tap to start recording
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <motion.p
            className="hero-sub"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
          >
            Real-time streaming powered by ElevenLabs Scribe v2
          </motion.p>
        </motion.section>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div className="alert alert--error" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <span className="alert-badge">!</span>
              <span className="alert-msg">{error}</span>
              <button className="alert-close" onClick={() => setError(null)}>×</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Transcription Panel ── */}
        <AnimatePresence>
          {currentDisplayText && (
            <motion.section
              className="transcript-panel"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ type: 'spring', stiffness: 180, damping: 22 }}
            >
              {/* Panel Header */}
              <div className="panel-head">
                <div className="panel-head-left">
                  {isRecording && <span className="live-pip">LIVE</span>}
                  <h2 className="panel-title">{isRecording ? 'Transcribing' : 'Transcript'}</h2>
                </div>
                <div className="panel-head-right">
                  {detectedLanguage && (
                    <span className="lang-tag">
                      {langName(detectedLanguage)}
                      {languageConfidence && <span className="lang-conf">{languageConfidence}%</span>}
                    </span>
                  )}
                </div>
              </div>

              {/* Streaming indicator */}
              {isRecording && <div className="stream-line" />}

              {/* Panel Body */}
              <div className={`panel-body ${isRecording ? 'is-live' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                {segments.length > 0 ? (
                  <div className="seg-list">
                    {segments.map((seg, i) => {
                      const sp = getSpeakerInfo(seg.speaker)
                      const rtl = seg.text && /[\u0600-\u06FF]/.test(seg.text)
                      return (
                        <motion.div key={i} className="seg-item" style={{ '--sp-color': sp.border, '--sp-bg': sp.bg }} dir={rtl ? 'rtl' : 'ltr'} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, delay: i * 0.015 }}>
                          <div className="seg-who" style={{ color: sp.label }}>
                            <span className="seg-dot" style={{ background: sp.dot }} />
                            {sp.name}
                          </div>
                          <p className="seg-text">{seg.text}</p>
                        </motion.div>
                      )
                    })}
                    {isRecording && <motion.span className="blink-cursor" animate={{ opacity: [1, 0] }} transition={{ duration: 0.6, repeat: Infinity }}>▎</motion.span>}
                  </div>
                ) : (
                  <p className="plain-text">
                    {currentDisplayText}
                    {isRecording && <motion.span className="blink-cursor" animate={{ opacity: [1, 0] }} transition={{ duration: 0.6, repeat: Infinity }}>▎</motion.span>}
                  </p>
                )}
                <div ref={transcriptionEndRef} />
              </div>

              {/* Panel Footer */}
              {!isRecording && transcription && (
                <div className="panel-foot">
                  <div className="foot-stats">
                    <div className="foot-stat"><span className="fs-val">{wordCount}</span><span className="fs-lbl">words</span></div>
                    <div className="foot-stat"><span className="fs-val">{chunkCount}</span><span className="fs-lbl">chunks</span></div>
                    {segments.length > 0 && <div className="foot-stat"><span className="fs-val">{new Set(segments.map(s => s.speaker)).size}</span><span className="fs-lbl">speakers</span></div>}
                  </div>
                  <div className="foot-actions">
                    <button className="btn-outline btn-sm" onClick={() => {
                      const t = segments.length > 0
                        ? segments.map(s => { const info = getSpeakerInfo(s.speaker); return `[${info.name}]: ${s.text}` }).join('\n\n')
                        : transcription
                      navigator.clipboard.writeText(t)
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                      Copy
                    </button>
                    {!pipelineRunning && (
                      <button className="btn-gold btn-sm" onClick={runPipeline}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10" /></svg>
                        Analyze
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── Pipeline Progress ── */}
        <AnimatePresence>
          {pipelineRunning && pipelineProgress && (
            <motion.section className="pipeline-progress" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="pp-header">
                <motion.div className="pp-spin" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
                <span className="pp-label">AI Pipeline</span>
              </div>
              <div className="pp-track">
                <motion.div className="pp-fill" initial={{ width: 0 }} animate={{ width: `${(pipelineProgress.step / pipelineProgress.total) * 100}%` }} transition={{ duration: 0.4, ease: 'easeOut' }} />
              </div>
              <p className="pp-step">Step {pipelineProgress.step}/{pipelineProgress.total} — {pipelineProgress.label}</p>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Pipeline Error */}
        <AnimatePresence>
          {pipelineError && (
            <motion.div className="alert alert--error" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <span className="alert-badge">!</span>
              <span className="alert-msg">Pipeline: {pipelineError}</span>
              <button className="alert-close" onClick={() => setPipelineError(null)}>×</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Pipeline Results ── */}
        <AnimatePresence>
          {pipelineResults && (
            <motion.section
              className="results-container"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ type: 'spring', stiffness: 160, damping: 20 }}
            >
              {/* Results Banner */}
              <div className="results-banner">
                <div className="rb-left">
                  <span className="rb-icon">✦</span>
                  <h2 className="rb-title">Analysis Complete</h2>
                </div>
                <span className="rb-time">{pipelineResults.processing_time}s</span>
              </div>

              {/* Action Buttons */}
              {/* Removed Build Requirements Spec button - now only available in AI Assistant popup */}


              <div className="results-grid">

                {/* ── Summary ── */}
                {pipelineResults.summary?.summary && (
                  <div className="rcard rcard--wide">
                    <div className="rcard-head"><span className="rcard-icon">📋</span><h3>Meeting Summary</h3></div>
                    <p className="rcard-text">{pipelineResults.summary.summary}</p>

                    {pipelineResults.summary?.participants?.length > 0 && (
                      <div className="chip-row">
                        <span className="chip-label">Participants</span>
                        {pipelineResults.summary.participants.map((p, i) => <span key={i} className="chip">{p}</span>)}
                      </div>
                    )}

                    {pipelineResults.summary.topics_discussed?.length > 0 && (
                      <div className="rcard-sub">
                        <h4>Topics</h4>
                        <div className="chip-row">{pipelineResults.summary.topics_discussed.map((t, i) => <span key={i} className="chip chip--subtle">{t}</span>)}</div>
                      </div>
                    )}

                    {pipelineResults.summary.key_decisions?.length > 0 && (
                      <div className="rcard-sub">
                        <h4>Key Decisions</h4>
                        <ul className="arrow-list">{pipelineResults.summary.key_decisions.map((d, i) => <li key={i}>{d}</li>)}</ul>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Functional Requirements ── */}
                {pipelineResults.requirements?.functional_requirements?.length > 0 && (
                  <div className="rcard rcard--wide">
                    <div className="rcard-head"><span className="rcard-icon">⚙️</span><h3>Functional Requirements <span className="count-badge">{pipelineResults.requirements.functional_requirements.length}</span></h3></div>
                    <div className="req-rows">
                      {pipelineResults.requirements.functional_requirements.map((r, i) => (
                        <div key={i} className="req-row">
                          <span className="req-id">{r.id}</span>
                          <span className="req-desc">{r.description}</span>
                          <span className={`priority-tag p-${r.priority}`}>{r.priority}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Non-Functional Requirements ── */}
                {pipelineResults.requirements?.non_functional_requirements?.length > 0 && (
                  <div className="rcard rcard--wide">
                    <div className="rcard-head"><span className="rcard-icon">🛡️</span><h3>Non-Functional Requirements <span className="count-badge">{pipelineResults.requirements.non_functional_requirements.length}</span></h3></div>
                    <div className="nfr-grid">
                      {pipelineResults.requirements.non_functional_requirements.map((r, i) => (
                        <div key={i} className="nfr-tile">
                          <div className="nfr-top"><span className="nfr-id">{r.id}</span>{r.category && <span className="nfr-cat">{r.category}</span>}</div>
                          <p className="nfr-desc">{r.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Ambiguities ── */}
                {pipelineResults.ambiguity_detection?.ambiguities?.length > 0 && (
                  <div className="rcard rcard--wide">
                    <div className="rcard-head">
                      <span className="rcard-icon">⚠️</span>
                      <h3>Ambiguities <span className="count-badge">{pipelineResults.ambiguity_detection.ambiguities.length}</span></h3>
                      {pipelineResults.ambiguity_detection.completeness_score != null && (
                        <span className="completeness">{Math.round(pipelineResults.ambiguity_detection.completeness_score * 100)}% complete</span>
                      )}
                    </div>

                    {pipelineResults.ambiguity_detection.severity_summary && (
                      <div className="sev-row">
                        {Object.entries(pipelineResults.ambiguity_detection.severity_summary).map(([level, count]) => count > 0 && <span key={level} className={`sev-tag sev-${level}`}>{count} {level}</span>)}
                      </div>
                    )}

                    <div className="amb-list">
                      {pipelineResults.ambiguity_detection.ambiguities.map((a, i) => (
                        <div key={i} className={`amb-card bdr-${a.severity}`}>
                          <div className="amb-top">
                            <span className="amb-id">{a.id}</span>
                            <span className="amb-type">{(a.type || '').replace(/_/g, ' ')}</span>
                            <span className={`sev-tag sev-${a.severity}`}>{a.severity}</span>
                          </div>
                          {a.original_statement && <blockquote className="amb-quote">"{a.original_statement}"</blockquote>}
                          <p className="amb-issue">{a.issue_description}</p>
                          {a.impact && <div className="amb-detail"><strong>Impact:</strong> {a.impact}</div>}
                          {a.recommendation && <div className="amb-detail amb-fix"><strong>Fix:</strong> {a.recommendation}</div>}
                        </div>
                      ))}
                    </div>

                    {pipelineResults.ambiguity_detection.overall_assessment && (
                      <div className="assess-box"><p>{pipelineResults.ambiguity_detection.overall_assessment}</p></div>
                    )}
                  </div>
                )}

                {/* ── Warnings ── */}
                {pipelineResults.ambiguity_detection?.warnings?.length > 0 && (
                  <div className="rcard rcard--wide">
                    <div className="rcard-head"><span className="rcard-icon">🚨</span><h3>Risk Warnings <span className="count-badge">{pipelineResults.ambiguity_detection.warnings.length}</span></h3></div>
                    <div className="warn-list">
                      {pipelineResults.ambiguity_detection.warnings.map((w, i) => (
                        <div key={i} className={`warn-card bdr-${w.severity}`}>
                          <div className="warn-top"><span className="warn-id">{w.id}</span><span className="warn-cat">{(w.category || '').replace(/_/g, ' ')}</span><span className={`sev-tag sev-${w.severity}`}>{w.severity}</span></div>
                          <p className="warn-desc">{w.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Clarification Questions ── */}
                {pipelineResults.clarification_questions?.questions?.length > 0 && (
                  <div className="rcard rcard--wide">
                    <div className="rcard-head"><span className="rcard-icon">❓</span><h3>Clarification Questions <span className="count-badge">{pipelineResults.clarification_questions.questions.length}</span></h3></div>
                    <div className="q-list">
                      {pipelineResults.clarification_questions.questions.map((q, i) => (
                        <div key={i} className={`q-card bdr-q-${q.priority}`}>
                          <div className="q-top"><span className="q-id">{q.id}</span><span className="q-cat">{(q.category || '').replace(/_/g, ' ')}</span><span className={`sev-tag sev-q-${q.priority}`}>{(q.priority || '').replace(/_/g, ' ')}</span></div>
                          <p className="q-text">{q.question}</p>
                          {q.context && <p className="q-ctx">{q.context}</p>}
                        </div>
                      ))}
                    </div>
                    {pipelineResults.clarification_questions.recommended_meeting_agenda?.length > 0 && (
                      <div className="rcard-sub agenda"><h4>Recommended Agenda</h4><ol className="agenda-ol">{pipelineResults.clarification_questions.recommended_meeting_agenda.map((item, i) => <li key={i}>{item}</li>)}</ol></div>
                    )}
                  </div>
                )}

                {/* ── Consultant Guidance ── */}
                {pipelineResults.consultant_guidance && (
                  <div className="rcard rcard--wide">
                    <div className="rcard-head"><span className="rcard-icon">🎯</span><h3>Consultant Guidance</h3></div>

                    {pipelineResults.consultant_guidance.client_intent_summary && (
                      <div className="rcard-sub"><h4>Client Intent</h4><p className="rcard-text">{pipelineResults.consultant_guidance.client_intent_summary}</p></div>
                    )}

                    {pipelineResults.consultant_guidance.key_insights?.length > 0 && (
                      <div className="rcard-sub">
                        <h4>Key Insights</h4>
                        <div className="insight-rows">
                          {pipelineResults.consultant_guidance.key_insights.map((ins, i) => (
                            <div key={i} className="insight-row"><span className={`imp-dot imp-${ins.importance}`} /><p>{ins.insight}</p></div>
                          ))}
                        </div>
                      </div>
                    )}

                    {pipelineResults.consultant_guidance.hidden_requirements?.length > 0 && (
                      <div className="rcard-sub"><h4>Hidden Requirements</h4><ul className="arrow-list icon-search">{pipelineResults.consultant_guidance.hidden_requirements.map((h, i) => <li key={i}>{h}</li>)}</ul></div>
                    )}

                    {pipelineResults.consultant_guidance.risk_areas?.length > 0 && (
                      <div className="rcard-sub">
                        <h4>Risk Areas</h4>
                        <div className="risk-tiles">{pipelineResults.consultant_guidance.risk_areas.map((r, i) => (
                          <div key={i} className={`risk-tile bdr-${r.risk_level}`}>
                            <div className="risk-top"><span className={`sev-tag sev-${r.risk_level}`}>{r.risk_level}</span><span className="risk-area-name">{r.area}</span></div>
                            {r.mitigation && <p className="risk-mit">{r.mitigation}</p>}
                          </div>
                        ))}</div>
                      </div>
                    )}

                    {pipelineResults.consultant_guidance.stakeholder_analysis?.length > 0 && (
                      <div className="rcard-sub">
                        <h4>Stakeholders</h4>
                        <div className="stake-grid">{pipelineResults.consultant_guidance.stakeholder_analysis.map((s, i) => (
                          <div key={i} className="stake-card">
                            <div className="stake-top"><span className="stake-role">{s.role}</span><span className={`sev-tag sev-${s.influence}`}>{s.influence}</span></div>
                            {s.concerns?.length > 0 && <ul className="stake-concerns">{s.concerns.map((c, j) => <li key={j}>{c}</li>)}</ul>}
                          </div>
                        ))}</div>
                      </div>
                    )}

                    {pipelineResults.consultant_guidance.recommended_next_steps?.length > 0 && (
                      <div className="rcard-sub next-steps"><h4>Next Steps</h4><ol className="next-ol">{pipelineResults.consultant_guidance.recommended_next_steps.map((s, i) => <li key={i}>{s}</li>)}</ol></div>
                    )}
                  </div>
                )}

                {/* ── Technology Stack Recommendation ── */}
                {pipelineResults.consultant_guidance?.technology_stack_recommendation && (
                  <div className="rcard rcard--wide">
                    <div className="rcard-head"><span className="rcard-icon">🛠️</span><h3>Technology Stack Recommendation</h3></div>

                    {/* Frontend */}
                    {pipelineResults.consultant_guidance.technology_stack_recommendation.frontend?.length > 0 && (
                      <div className="rcard-sub">
                        <h4>Frontend</h4>
                        <div className="tech-tiles">
                          {pipelineResults.consultant_guidance.technology_stack_recommendation.frontend.map((t, i) => (
                            <div key={i} className="tech-tile">
                              <div className="tech-top">
                                <span className="tech-name">{t.technology}</span>
                                <span className={`sev-tag sev-conf-${(t.confidence || 'medium').toLowerCase()}`}>{(t.confidence || 'medium').toUpperCase()}</span>
                              </div>
                              {t.rationale && <p className="tech-rationale">{t.rationale}</p>}
                              {t.alternatives?.length > 0 && <p className="tech-alts">Alternatives: {t.alternatives.join(', ')}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Backend */}
                    {pipelineResults.consultant_guidance.technology_stack_recommendation.backend?.length > 0 && (
                      <div className="rcard-sub">
                        <h4>Backend</h4>
                        <div className="tech-tiles">
                          {pipelineResults.consultant_guidance.technology_stack_recommendation.backend.map((t, i) => (
                            <div key={i} className="tech-tile">
                              <div className="tech-top">
                                <span className="tech-name">{t.technology}</span>
                                <span className={`sev-tag sev-conf-${(t.confidence || 'medium').toLowerCase()}`}>{(t.confidence || 'medium').toUpperCase()}</span>
                              </div>
                              {t.rationale && <p className="tech-rationale">{t.rationale}</p>}
                              {t.alternatives?.length > 0 && <p className="tech-alts">Alternatives: {t.alternatives.join(', ')}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Database */}
                    {pipelineResults.consultant_guidance.technology_stack_recommendation.database?.length > 0 && (
                      <div className="rcard-sub">
                        <h4>Database</h4>
                        <div className="tech-tiles">
                          {pipelineResults.consultant_guidance.technology_stack_recommendation.database.map((t, i) => (
                            <div key={i} className="tech-tile">
                              <div className="tech-top">
                                <span className="tech-name">{t.technology}</span>
                                <span className={`sev-tag sev-conf-${(t.confidence || 'medium').toLowerCase()}`}>{(t.confidence || 'medium').toUpperCase()}</span>
                              </div>
                              {t.rationale && <p className="tech-rationale">{t.rationale}</p>}
                              {t.alternatives?.length > 0 && <p className="tech-alts">Alternatives: {t.alternatives.join(', ')}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Infrastructure */}
                    {pipelineResults.consultant_guidance.technology_stack_recommendation.infrastructure?.length > 0 && (
                      <div className="rcard-sub">
                        <h4>Infrastructure & Deployment</h4>
                        <div className="tech-tiles">
                          {pipelineResults.consultant_guidance.technology_stack_recommendation.infrastructure.map((t, i) => (
                            <div key={i} className="tech-tile">
                              <div className="tech-top">
                                <span className="tech-name">{t.technology}</span>
                                <span className={`sev-tag sev-conf-${(t.confidence || 'medium').toLowerCase()}`}>{(t.confidence || 'medium').toUpperCase()}</span>
                              </div>
                              {t.rationale && <p className="tech-rationale">{t.rationale}</p>}
                              {t.alternatives?.length > 0 && <p className="tech-alts">Alternatives: {t.alternatives.join(', ')}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Third-party Services */}
                    {pipelineResults.consultant_guidance.technology_stack_recommendation.third_party_services?.length > 0 && (
                      <div className="rcard-sub">
                        <h4>Third-Party Services</h4>
                        <div className="tech-tiles">
                          {pipelineResults.consultant_guidance.technology_stack_recommendation.third_party_services.map((s, i) => (
                            <div key={i} className="tech-tile">
                              <div className="tech-top">
                                <span className="tech-name">{s.service}</span>
                                {s.purpose && <span className="tech-purpose">{s.purpose}</span>}
                                <span className={`sev-tag sev-conf-${(s.confidence || 'medium').toLowerCase()}`}>{(s.confidence || 'medium').toUpperCase()}</span>
                              </div>
                              {s.rationale && <p className="tech-rationale">{s.rationale}</p>}
                              {s.alternatives?.length > 0 && <p className="tech-alts">Alternatives: {s.alternatives.join(', ')}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Development Tools */}
                    {pipelineResults.consultant_guidance.technology_stack_recommendation.development_tools?.length > 0 && (
                      <div className="rcard-sub">
                        <h4>Development Tools</h4>
                        <div className="tech-tiles">
                          {pipelineResults.consultant_guidance.technology_stack_recommendation.development_tools.map((t, i) => (
                            <div key={i} className="tech-tile">
                              <div className="tech-top">
                                <span className="tech-name">{t.tool}</span>
                                {t.purpose && <span className="tech-purpose">{t.purpose}</span>}
                              </div>
                              {t.rationale && <p className="tech-rationale">{t.rationale}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Project Estimates */}
                    {(pipelineResults.consultant_guidance.technology_stack_recommendation.estimated_complexity ||
                      pipelineResults.consultant_guidance.technology_stack_recommendation.estimated_timeline ||
                      pipelineResults.consultant_guidance.technology_stack_recommendation.team_composition_suggestion) && (
                        <div className="rcard-sub">
                          <h4>Project Estimates</h4>
                          <div className="est-grid">
                            {pipelineResults.consultant_guidance.technology_stack_recommendation.estimated_complexity && (
                              <div className="est-item">
                                <span className="est-label">Complexity</span>
                                <span className={`est-val est-${pipelineResults.consultant_guidance.technology_stack_recommendation.estimated_complexity}`}>
                                  {pipelineResults.consultant_guidance.technology_stack_recommendation.estimated_complexity.replace(/_/g, ' ')}
                                </span>
                              </div>
                            )}
                            {pipelineResults.consultant_guidance.technology_stack_recommendation.estimated_timeline && (
                              <div className="est-item">
                                <span className="est-label">Timeline</span>
                                <span className="est-val">{pipelineResults.consultant_guidance.technology_stack_recommendation.estimated_timeline}</span>
                              </div>
                            )}
                            {pipelineResults.consultant_guidance.technology_stack_recommendation.team_composition_suggestion && (
                              <div className="est-item est-team">
                                <span className="est-label">Team</span>
                                <div className="team-chips">
                                  {Object.entries(pipelineResults.consultant_guidance.technology_stack_recommendation.team_composition_suggestion)
                                    .filter(([, v]) => v > 0)
                                    .map(([role, count]) => (
                                      <span key={role} className="chip">{count} {role.replace(/_/g, ' ')}</span>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                )}

                {/* ── Action Items ── */}
                {(pipelineResults.requirements?.action_items?.length > 0 || pipelineResults.summary?.action_items?.length > 0) && (
                  <div className="rcard rcard--wide">
                    <div className="rcard-head"><span className="rcard-icon">✅</span><h3>Action Items</h3></div>
                    <div className="action-tiles">
                      {(pipelineResults.requirements?.action_items || pipelineResults.summary?.action_items || []).map((a, i) => (
                        <div key={i} className="action-tile"><div className="action-owner">{a.owner || 'TBD'}</div><p className="action-task">{a.task}</p>{a.deadline && <span className="action-dl">📅 {a.deadline}</span>}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Open Questions ── */}
                {pipelineResults.requirements?.open_questions?.length > 0 && (
                  <div className="rcard rcard--wide">
                    <div className="rcard-head"><span className="rcard-icon">💭</span><h3>Open Questions</h3></div>
                    <ul className="arrow-list icon-q">{pipelineResults.requirements.open_questions.map((q, i) => <li key={i}>{q}</li>)}</ul>
                  </div>
                )}

                {/* ── Diagram ── */}
                {pipelineResults.mermaid_code && (
                  <div className="rcard rcard--wide">
                    <div className="rcard-head"><span className="rcard-icon">🏗️</span><h3>System Diagram</h3></div>
                    {pipelineResults.diagram?.description && <p className="rcard-text diagram-desc">{pipelineResults.diagram.description}</p>}
                    <MermaidDiagram code={pipelineResults.mermaid_code} />
                  </div>
                )}
              </div>

              {/* Downloads bar */}
              <div className="dl-bar">
                {pipelineResults.pdf_report && (
                  <a href={`${PIPELINE_DOWNLOAD}/${pipelineResults.pdf_report}`} className="btn-gold btn-sm" target="_blank" rel="noreferrer">
                    <span>📄</span> PDF Report
                  </a>
                )}
                {pipelineResults.diagram_file && (
                  <a href={`${PIPELINE_DOWNLOAD}/${pipelineResults.diagram_file}`} className="btn-outline btn-sm" target="_blank" rel="noreferrer">
                    <span>🖼️</span> Diagram
                  </a>
                )}
                {!pipelineRunning && transcription && (
                  <button className="btn-outline btn-sm" onClick={runPipeline}>
                    <span>🔄</span> Re-run
                  </button>
                )}
              </div>

              <div ref={pipelineEndRef} />
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* ── AI Assistant Chat Popup (floating notification bubble) ── */}
      <DiagramChatPopup
        socket={socketRef.current}
        pipelineResults={pipelineResults}
        visible={!!pipelineResults}
        startOnTab={diagramChatInitialTab}
        onTabActivated={() => setDiagramChatInitialTab(null)}
      />
    </div>
  )
}

export default App
