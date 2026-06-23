import React, { useState, useRef, useCallback } from 'react'

interface Requirement {
  text: string
  priority?: string
  type?: string
}

interface AnalysisResult {
  requirements?: Requirement[]
  functional_requirements?: Array<{ description?: string; text?: string; priority?: string } | string>
  non_functional_requirements?: Array<{ description?: string; text?: string } | string>
  summary?: { overview?: string; participants?: string[]; decisions?: string[]; key_topics?: string[] }
  ambiguities?: Array<{ description?: string; text?: string; severity?: string } | string>
  warnings?: Array<{ description?: string; text?: string; severity?: string } | string>
  completeness_score?: number
  clarification_questions?: Array<{ question?: string; text?: string } | string>
  key_insights?: Array<{ insight?: string; text?: string } | string>
  risk_areas?: Array<{ area?: string; description?: string; text?: string } | string>
  recommended_next_steps?: string[]
  system_architecture?: {
    architecture_style?: string
    system_layers?: string[]
    api_endpoints?: string[]
    database_schema?: string[]
    technology_stack?: Record<string, string>
  }
  steps_completed?: string[]
}

interface Segment {
  speaker: string
  text: string
}

interface MeetingRecorderProps {
  isOpen: boolean
  onClose: () => void
  onRequirementsExtracted: (prompt: string, analysis: AnalysisResult) => void
}

const SPEAKER_COLORS = [
  { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
]

const PIPELINE_STEPS = [
  { key: 'ingest', label: 'Indexing transcript' },
  { key: 'requirements', label: 'Extracting requirements' },
  { key: 'summary', label: 'Generating summary' },
  { key: 'ambiguity_detection', label: 'Detecting ambiguities' },
  { key: 'clarification_questions', label: 'Generating questions' },
  { key: 'consultant_guidance', label: 'Consultant analysis' },
  { key: 'system_architecture', label: 'System architecture' },
]

type MainTab = 'record' | 'paste'
type ResultTab = 'transcript' | 'requirements' | 'analysis'

const LANGUAGES = [
  { value: 'en', label: 'GB English' },
  { value: 'fr', label: 'FR French' },
  { value: 'ar', label: 'AR Arabic' },
]

export const MeetingRecorder: React.FC<MeetingRecorderProps> = ({
  isOpen, onClose, onRequirementsExtracted,
}) => {
  const [status, setStatus] = useState<'idle' | 'recording' | 'transcribing' | 'analyzing' | 'done'>('idle')
  const [segments, setSegments] = useState<Segment[]>([])
  const [rawTranscript, setRawTranscript] = useState('')
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState('')
  const [selectedLang, setSelectedLang] = useState('en')
  const [recordingTime, setRecordingTime] = useState(0)
  const [mainTab, setMainTab] = useState<MainTab>('record')
  const [resultTab, setResultTab] = useState<ResultTab>('transcript')
  const [pipelineProgress, setPipelineProgress] = useState<string[]>([])
  const [specStatus, setSpecStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle')
  const [specUrl, setSpecUrl] = useState<string | null>(null)
  const [specError, setSpecError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const speakerColorMap = useRef<Record<string, number>>({})
  const colorIdx = useRef(0)

  const getSpeakerColor = (speaker: string) => {
    if (!(speaker in speakerColorMap.current)) {
      speakerColorMap.current[speaker] = colorIdx.current % SPEAKER_COLORS.length
      colorIdx.current++
    }
    return SPEAKER_COLORS[speakerColorMap.current[speaker]]
  }

  const startRecording = useCallback(async () => {
    setError('')
    setSegments([])
    setRawTranscript('')
    setAnalysis(null)
    setRecordingTime(0)
    setPipelineProgress([])
    setSpecStatus('idle')
    setSpecUrl(null)
    setSpecError(null)
    speakerColorMap.current = {}
    colorIdx.current = 0

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      audioChunksRef.current = []
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mediaRecorder.start(1000)
      mediaRecorderRef.current = mediaRecorder
      setStatus('recording')
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
    } catch {
      setError('Microphone access denied. Please allow microphone access and try again.')
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    const mr = mediaRecorderRef.current
    if (!mr) return
    mr.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      await transcribeAudio(audioBlob)
    }
    mr.stop()
    mr.stream.getTracks().forEach(t => t.stop())
    setStatus('transcribing')
  }, [])

  const transcribeAudio = async (audioBlob: Blob) => {
    const formData = new FormData()
    formData.append('audio', audioBlob, 'recording.webm')
    formData.append('language', selectedLang)
    try {
      const resp = await fetch('/transcript/stream/api/transcribe', { method: 'POST', body: formData })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      const text = data.transcript || ''
      setRawTranscript(text)
      if (data.segments?.length) {
        setSegments(data.segments.map((s: Record<string, string>) => ({
          speaker: s.speaker || s.speaker_id || 'Speaker',
          text: s.text || '',
        })))
      }
      if (text) {
        await analyzeTranscript(text)
      } else {
        setError('No speech detected — try recording again or paste a transcript.')
        setStatus('done')
      }
    } catch (e: unknown) {
      setError(`Transcription failed: ${e instanceof Error ? e.message : String(e)}`)
      setStatus('idle')
    }
  }

  const analyzeTranscript = async (text: string) => {
    setStatus('analyzing')
    setPipelineProgress([])
    try {
      const resp = await fetch('/transcript/stream/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (resp.ok) {
        const data = await resp.json()
        setAnalysis(data)
        setPipelineProgress(data.steps_completed || [])
        if (data.requirements?.length || data.summary) setResultTab('requirements')
      }
    } catch { /* pipeline is optional */ }
    setStatus('done')
  }

  const generateSpec = async () => {
    if (!analysis) return
    setSpecStatus('generating')
    setSpecError(null)
    try {
      const resp = await fetch('/transcript/stream/api/generate-specification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipeline_results: analysis }),
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      if (data.error) throw new Error(data.error)
      setSpecUrl(`/transcript/stream${data.download_url}`)
      setSpecStatus('done')
    } catch (e: unknown) {
      setSpecError(e instanceof Error ? e.message : String(e))
      setSpecStatus('error')
    }
  }

  const buildPrompt = () => {
    if (!analysis && !rawTranscript.trim()) return ''
    if (!analysis) return rawTranscript.trim()
    const parts: string[] = []
    if (analysis.summary?.overview) parts.push(analysis.summary.overview)
    const frTexts = (analysis.functional_requirements || [])
      .map(r => typeof r === 'string' ? r : (r as Record<string,string>).description || (r as Record<string,string>).text || '')
      .filter(Boolean).slice(0, 10)
    if (frTexts.length) parts.push(`Features:\n${frTexts.map(t => `- ${t}`).join('\n')}`)
    const arch = analysis.system_architecture
    if (arch?.technology_stack) {
      parts.push(`Tech stack: ${Object.entries(arch.technology_stack).map(([k, v]) => `${k}: ${v}`).join(', ')}`)
    } else {
      parts.push('Tech stack: React + Tailwind CSS')
    }
    return parts.join('\n\n')
  }

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const getText = (item: Record<string, string> | string): string => {
    if (typeof item === 'string') return item
    return item.description || item.text || item.question || item.insight || item.area || ''
  }

  const frList = analysis?.functional_requirements || []
  const nfrList = analysis?.non_functional_requirements || []
  const ambiguities = analysis?.ambiguities || []
  const questions = analysis?.clarification_questions || []
  const insights = analysis?.key_insights || []

  const hasResults = status === 'done' && (rawTranscript || analysis)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            {/* headphone icon */}
            <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">Import from Meeting</h2>
              <p className="text-[11px] text-stone-400 font-medium mt-0.5">Record Transcribe (ElevenLabs) AI Analysis</p>
            </div>
          </div>
          {/* Language selector */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <select
                value={selectedLang}
                onChange={e => setSelectedLang(e.target.value)}
                disabled={status === 'recording'}
                className="appearance-none pl-3 pr-7 py-1.5 border border-stone-200 rounded-lg text-xs font-semibold text-stone-700 bg-white outline-none cursor-pointer"
              >
                {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
              <svg className="w-3 h-3 text-stone-400 absolute right-2 top-2.5 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>
        </div>

        {/* ── Main tabs ───────────────────────────────────────── */}
        {!hasResults && (
          <div className="flex border-b border-stone-100 px-6">
            {([
              { id: 'record', label: 'Record Transcribe (ElevenLabs)' },
              { id: 'paste',  label: 'PASTE A TRANSCRIPT' },
            ] as { id: MainTab; label: string }[]).map(t => (
              <button key={t.id} onClick={() => setMainTab(t.id)}
                className={`mr-6 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${mainTab === t.id ? 'border-[#019cda] text-[#019cda]' : 'border-transparent text-stone-400 hover:text-stone-600'}`}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Result tabs (after analysis) ───────────────────── */}
        {hasResults && (
          <div className="flex border-b border-stone-100 px-6">
            {([
              { id: 'transcript',   label: 'Transcript' },
              { id: 'requirements', label: `Requirements${frList.length ? ` (${frList.length + nfrList.length})` : ''}` },
              { id: 'analysis',     label: `Analysis${ambiguities.length ? ` (${ambiguities.length + questions.length + insights.length})` : ''}` },
            ] as { id: ResultTab; label: string }[]).map(t => (
              <button key={t.id} onClick={() => setResultTab(t.id)}
                className={`mr-6 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${resultTab === t.id ? 'border-[#019cda] text-[#019cda]' : 'border-transparent text-stone-400 hover:text-stone-600'}`}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Content ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 min-h-0" style={{ maxHeight: 380 }}>

          {/* error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* ── RECORD TAB (idle / recording / transcribing / analyzing) */}
          {!hasResults && mainTab === 'record' && (
            <>
              {/* Status box */}
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-6 text-center space-y-3">
                {status === 'idle' && (
                  <>
                    <p className="text-sm font-semibold text-stone-700">ElevenLabs Voice Recognition stream is ready</p>
                    <p className="text-xs text-stone-400 font-medium">Ready to record meeting...</p>
                    <button onClick={startRecording}
                      className="mt-1 px-7 py-2.5 bg-[#15395e] hover:bg-[#1a4470] text-white text-sm font-bold rounded-full cursor-pointer transition-all shadow-sm">
                      Start Recording
                    </button>
                  </>
                )}
                {status === 'recording' && (
                  <>
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-ping"/>
                      <p className="text-sm font-bold text-red-600">Recording — {fmtTime(recordingTime)}</p>
                    </div>
                    <p className="text-xs text-stone-400">Speak clearly near your microphone...</p>
                    <button onClick={stopRecording}
                      className="mt-1 px-7 py-2.5 bg-stone-800 hover:bg-stone-900 text-white text-sm font-bold rounded-full cursor-pointer transition-all shadow-sm">
                      Stop Recording
                    </button>
                  </>
                )}
                {status === 'transcribing' && (
                  <>
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#019cda] border-t-transparent rounded-full animate-spin"/>
                      <p className="text-sm font-semibold text-[#019cda]">Transcribing with ElevenLabs…</p>
                    </div>
                    <p className="text-xs text-stone-400">Processing your audio, please wait...</p>
                  </>
                )}
                {status === 'analyzing' && (
                  <>
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"/>
                      <p className="text-sm font-semibold text-violet-600">AI Analysis running…</p>
                    </div>
                    {pipelineProgress.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                        {PIPELINE_STEPS.map(step => {
                          const done = pipelineProgress.includes(step.key)
                          return (
                            <span key={step.key} className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${done ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-stone-100 border-stone-200 text-stone-400'}`}>
                              {done ? '✓ ' : ''}{step.label}
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Transcript textarea (always present on record tab) */}
              <textarea
                value={rawTranscript}
                onChange={e => setRawTranscript(e.target.value)}
                rows={4}
                placeholder="Record a meeting or paste a transcript: The AI will automatically extract functional requirements, detect core ambiguities, and prepare a optimized prompt for instantaneous UI generation."
                className="w-full p-4 border border-stone-200 rounded-xl text-xs text-stone-600 placeholder-stone-400 font-medium outline-none focus:border-[#019cda] resize-none leading-relaxed"
              />
            </>
          )}

          {/* ── PASTE TAB */}
          {!hasResults && mainTab === 'paste' && (
            <>
              <textarea
                value={rawTranscript}
                onChange={e => setRawTranscript(e.target.value)}
                rows={8}
                placeholder="Paste your meeting transcript here. The AI will automatically extract functional requirements, detect core ambiguities, and prepare a optimized prompt for instantaneous UI generation."
                className="w-full p-4 border border-stone-200 rounded-xl text-xs text-stone-600 placeholder-stone-400 font-medium outline-none focus:border-[#019cda] resize-none leading-relaxed"
              />
              {rawTranscript.trim() && (
                <button onClick={() => analyzeTranscript(rawTranscript)}
                  className="text-xs px-4 py-1.5 bg-[#019cda] hover:bg-[#0180b5] text-white rounded-lg font-bold cursor-pointer transition-colors">
                  Analyze Transcript
                </button>
              )}
            </>
          )}

          {/* ── RESULT: TRANSCRIPT TAB */}
          {hasResults && resultTab === 'transcript' && (
            <div className="space-y-3">
              {segments.length > 0 && (
                <div className="space-y-2">
                  {segments.map((seg, i) => {
                    const color = getSpeakerColor(seg.speaker)
                    return (
                      <div key={i} className={`flex gap-3 p-3 rounded-xl border ${color.bg} ${color.border}`}>
                        <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border ${color.bg} ${color.text} ${color.border}`}>
                          {seg.speaker.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className={`text-xs font-bold mb-0.5 ${color.text}`}>{seg.speaker}</p>
                          <p className="text-xs text-stone-700 leading-relaxed">{seg.text}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {analysis?.summary?.overview && (
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1.5">Meeting Summary</p>
                  <p className="text-xs text-stone-700 leading-relaxed">{analysis.summary.overview}</p>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Raw Transcript</p>
                  <button onClick={() => analyzeTranscript(rawTranscript)}
                    className="text-[10px] px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg font-bold cursor-pointer">
                    Re-analyze
                  </button>
                </div>
                <textarea value={rawTranscript} onChange={e => setRawTranscript(e.target.value)} rows={4}
                  className="w-full p-3 border border-stone-200 rounded-xl text-xs text-stone-600 font-medium outline-none focus:border-[#019cda] resize-none"/>
              </div>
            </div>
          )}

          {/* ── RESULT: REQUIREMENTS TAB */}
          {hasResults && resultTab === 'requirements' && (
            <div className="space-y-4">
              {analysis?.completeness_score != null && (
                <div className="flex items-center gap-3 p-3 bg-stone-50 border border-stone-200 rounded-xl">
                  <div className="text-2xl font-black text-[#019cda]">{analysis.completeness_score}%</div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-stone-700">Completeness Score</p>
                    <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-gradient-to-r from-[#019cda] to-[#15395e] rounded-full transition-all"
                        style={{ width: `${analysis.completeness_score}%` }}/>
                    </div>
                  </div>
                </div>
              )}
              {frList.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Functional Requirements ({frList.length})</p>
                  {frList.map((r, i) => {
                    const text = getText(r as Record<string, string>)
                    const priority = typeof r === 'object' ? (r as Record<string, string>).priority : undefined
                    return (
                      <div key={i} className="flex items-start gap-2 p-2.5 bg-blue-50 border border-blue-100 rounded-lg">
                        <span className="text-[10px] font-bold text-[#019cda] shrink-0 mt-0.5">FR{i + 1}</span>
                        {priority && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 uppercase ${priority === 'high' ? 'bg-red-100 text-red-600' : priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{priority}</span>
                        )}
                        <span className="text-xs text-stone-700">{text}</span>
                      </div>
                    )
                  })}
                </div>
              )}
              {nfrList.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Non-Functional Requirements ({nfrList.length})</p>
                  {nfrList.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 bg-stone-50 border border-stone-200 rounded-lg">
                      <span className="text-[10px] font-bold text-stone-400 shrink-0 mt-0.5">NFR{i + 1}</span>
                      <span className="text-xs text-stone-700">{getText(r as Record<string, string>)}</span>
                    </div>
                  ))}
                </div>
              )}
              {frList.length === 0 && nfrList.length === 0 && (
                <div className="text-center py-10 text-stone-400">
                  <p className="text-xs">No requirements extracted yet.</p>
                  {rawTranscript && <button onClick={() => analyzeTranscript(rawTranscript)} className="mt-3 text-xs px-4 py-1.5 bg-[#019cda]/10 text-[#019cda] rounded-lg hover:bg-[#019cda]/20 font-bold cursor-pointer">Run Analysis</button>}
                </div>
              )}
            </div>
          )}

          {/* ── RESULT: ANALYSIS TAB */}
          {hasResults && resultTab === 'analysis' && (
            <div className="space-y-4">
              {ambiguities.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Ambiguities ({ambiguities.length})</p>
                  {ambiguities.map((a, i) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-100 rounded-lg">
                      <span className="text-amber-400 shrink-0">⚠</span>
                      <span className="text-xs text-stone-700">{getText(a as Record<string, string>)}</span>
                    </div>
                  ))}
                </div>
              )}
              {questions.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Clarification Questions ({questions.length})</p>
                  {questions.map((q, i) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 bg-sky-50 border border-sky-100 rounded-lg">
                      <span className="text-[10px] font-bold text-sky-400 shrink-0 mt-0.5">Q{i + 1}</span>
                      <span className="text-xs text-stone-700">{getText(q as Record<string, string>)}</span>
                    </div>
                  ))}
                </div>
              )}
              {insights.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Key Insights ({insights.length})</p>
                  {insights.map((ins, i) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                      <span className="text-emerald-400 shrink-0">•</span>
                      <span className="text-xs text-stone-700">{getText(ins as Record<string, string>)}</span>
                    </div>
                  ))}
                </div>
              )}
              {ambiguities.length === 0 && questions.length === 0 && insights.length === 0 && (
                <div className="text-center py-10 text-stone-400">
                  <p className="text-xs">No analysis data available.</p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ── Footer ──────────────────────────────────────────── */}
        <div className="border-t border-stone-100 px-6 py-4 flex items-center justify-between shrink-0">
          <button onClick={onClose}
            className="text-sm text-stone-500 hover:text-stone-800 font-medium cursor-pointer transition-colors">
            Cancel
          </button>
          <div className="flex items-center gap-2">
            {hasResults && analysis && (
              specStatus === 'done' && specUrl ? (
                <a href={specUrl} download
                  className="px-4 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold flex items-center gap-1.5">
                  ⬇ Download PDF
                </a>
              ) : (
                <button onClick={generateSpec} disabled={specStatus === 'generating'}
                  className="px-4 py-2 text-xs bg-stone-100 hover:bg-stone-200 disabled:bg-stone-100 text-stone-700 rounded-full font-bold cursor-pointer flex items-center gap-1.5">
                  {specStatus === 'generating' ? <><span className="w-3 h-3 border-2 border-stone-400 border-t-transparent rounded-full animate-spin"/>Generating…</> : 'Project Spec'}
                </button>
              )
            )}
            {specStatus === 'error' && specError && (
              <span className="text-[10px] text-red-600">⚠ {specError}</span>
            )}
            <button
              onClick={() => { onRequirementsExtracted(buildPrompt(), analysis ?? {}); onClose() }}
              disabled={!rawTranscript.trim()}
              className="px-6 py-2 text-sm bg-[#019cda] hover:bg-[#0180b5] disabled:bg-stone-200 disabled:text-stone-400 text-white rounded-full font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm">
              Generate UI
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

export default MeetingRecorder
