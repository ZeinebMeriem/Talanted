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
  onRequirementsExtracted: (prompt: string) => void
}

const SPEAKER_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
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

type Tab = 'transcript' | 'requirements' | 'analysis' | 'architecture'

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
  const [activeTab, setActiveTab] = useState<Tab>('transcript')
  const [pipelineProgress, setPipelineProgress] = useState<string[]>([])

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
    // Set onstop BEFORE calling stop() to avoid the race condition
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
        setError('No speech detected — recording may have been too short or silent. Try recording again or paste a transcript below.')
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
        if (data.requirements?.length || data.summary) setActiveTab('requirements')
      }
    } catch { /* pipeline is optional */ }
    setStatus('done')
  }

  const buildPrompt = () => {
    if (!analysis && !rawTranscript.trim()) return ''
    if (!analysis) return rawTranscript.trim()

    const parts: string[] = []

    // App description from summary
    if (analysis.summary?.overview) {
      parts.push(analysis.summary.overview)
    }

    // Functional requirements → features list
    const frTexts = (analysis.functional_requirements || [])
      .map(r => typeof r === 'string' ? r : (r as Record<string,string>).description || (r as Record<string,string>).text || '')
      .filter(Boolean).slice(0, 10)
    if (frTexts.length) {
      parts.push(`Features:\n${frTexts.map(t => `- ${t}`).join('\n')}`)
    }

    // Architecture stack hint
    const arch = analysis.system_architecture
    if (arch?.technology_stack) {
      const stack = Object.entries(arch.technology_stack)
        .map(([k, v]) => `${k}: ${v}`).join(', ')
      parts.push(`Tech stack: ${stack}`)
    } else {
      parts.push('Tech stack: React + Tailwind CSS')
    }

    // Non-functional constraints
    const nfrTexts = (analysis.non_functional_requirements || [])
      .map(r => typeof r === 'string' ? r : (r as Record<string,string>).description || (r as Record<string,string>).text || '')
      .filter(Boolean).slice(0, 4)
    if (nfrTexts.length) {
      parts.push(`Constraints: ${nfrTexts.join('. ')}`)
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
  const warnings = analysis?.warnings || []
  const questions = analysis?.clarification_questions || []
  const insights = analysis?.key_insights || []
  const risks = analysis?.risk_areas || []
  const arch = analysis?.system_architecture

  const tabCount: Record<Tab, number> = {
    transcript: segments.length,
    requirements: frList.length + nfrList.length,
    analysis: ambiguities.length + questions.length + insights.length,
    architecture: arch ? 1 : 0,
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold">🎙️ Import from Meeting</h2>
            <p className="text-xs text-violet-200 mt-0.5">Record → Transcribe (ElevenLabs) → AI Analysis → Generate UI</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg text-white">✕</button>
        </div>

        {/* Controls bar */}
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3 flex-wrap shrink-0 bg-slate-50">
          <select
            value={selectedLang}
            onChange={e => setSelectedLang(e.target.value)}
            disabled={status === 'recording'}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
          >
            <option value="en">🇬🇧 English</option>
            <option value="fr">🇫🇷 French</option>
            <option value="ar">🇸🇦 Arabic</option>
          </select>

          {(status === 'idle' || status === 'done') && (
            <button
              onClick={startRecording}
              className="flex items-center gap-2 px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              🎙️ {status === 'done' ? 'Record Again' : 'Start Recording'}
            </button>
          )}
          {status === 'recording' && (
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-semibold"
            >
              ⏹ Stop — {fmtTime(recordingTime)}
            </button>
          )}

          {/* Status indicators */}
          {status === 'recording' && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping flex-shrink-0" />
              <span className="text-xs font-semibold text-red-700">Recording {fmtTime(recordingTime)}</span>
            </div>
          )}
          {status === 'transcribing' && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <span className="text-xs font-semibold text-blue-700">Transcribing with ElevenLabs…</span>
            </div>
          )}
          {status === 'analyzing' && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-50 border border-violet-200 rounded-lg">
              <div className="w-3.5 h-3.5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <span className="text-xs font-semibold text-violet-700">AI Analysis running…</span>
            </div>
          )}
        </div>

        {error && (
          <div className="mx-5 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 shrink-0">
            ⚠️ {error}
          </div>
        )}

        {/* Pipeline progress */}
        {(status === 'analyzing' || (status === 'done' && pipelineProgress.length > 0)) && (
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 shrink-0">
            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Pipeline Steps</p>
            <div className="flex flex-wrap gap-1.5">
              {PIPELINE_STEPS.map(step => {
                const done = pipelineProgress.includes(step.key)
                const running = status === 'analyzing' && !done
                return (
                  <div
                    key={step.key}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                      done
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : running
                        ? 'bg-violet-50 border-violet-200 text-violet-700'
                        : 'bg-slate-100 border-slate-200 text-slate-400'
                    }`}
                  >
                    {done ? '✓' : running ? <span className="w-2.5 h-2.5 border border-violet-400 border-t-transparent rounded-full animate-spin inline-block" /> : '○'}
                    {step.label}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Tabs — only when there's content */}
        {(rawTranscript || analysis) && (
          <div className="flex border-b border-slate-100 shrink-0 bg-white">
            {([
              { id: 'transcript', label: '📄 Transcript', count: tabCount.transcript },
              { id: 'requirements', label: '✅ Requirements', count: tabCount.requirements },
              { id: 'analysis', label: '🔍 Analysis', count: tabCount.analysis },
              { id: 'architecture', label: '🏗️ Architecture', count: tabCount.architecture },
            ] as { id: Tab; label: string; count: number }[]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-violet-600 text-violet-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── TRANSCRIPT TAB ── */}
          {activeTab === 'transcript' && (
            <div className="p-5 space-y-4">
              {/* Speaker segments */}
              {segments.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">👥 Speaker Transcript</h3>
                  <div className="space-y-2">
                    {segments.map((seg, i) => {
                      const color = getSpeakerColor(seg.speaker)
                      return (
                        <div key={i} className={`flex gap-3 p-3 rounded-xl border ${color.bg} ${color.border}`}>
                          <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${color.bg} ${color.text} border ${color.border}`}>
                            {seg.speaker.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className={`text-xs font-bold mb-0.5 ${color.text}`}>{seg.speaker}</p>
                            <p className="text-sm text-slate-700 leading-relaxed">{seg.text}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Editable raw transcript */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    {rawTranscript ? 'Full Transcript' : '📋 Paste a transcript'}
                  </h3>
                  {rawTranscript && status === 'done' && (
                    <button
                      onClick={() => analyzeTranscript(rawTranscript)}
                      className="text-xs px-3 py-1 bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 font-semibold"
                    >
                      ▶ Re-analyze
                    </button>
                  )}
                </div>
                <textarea
                  value={rawTranscript}
                  onChange={e => setRawTranscript(e.target.value)}
                  rows={5}
                  placeholder="Paste your meeting transcript here to extract requirements..."
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none text-slate-700"
                />
                {rawTranscript && status === 'idle' && (
                  <button
                    onClick={() => analyzeTranscript(rawTranscript)}
                    className="mt-2 text-xs px-3 py-1.5 bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 font-semibold"
                  >
                    ▶ Analyze
                  </button>
                )}
              </div>

              {/* Summary card */}
              {analysis?.summary?.overview && (
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                  <p className="text-xs font-bold text-indigo-700 mb-1.5">📋 Meeting Summary</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{analysis.summary.overview}</p>
                  {(analysis.summary.participants?.length ?? 0) > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {analysis.summary.participants!.map((p, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-white border border-indigo-200 rounded-full text-indigo-600 font-medium">{p}</span>
                      ))}
                    </div>
                  )}
                  {(analysis.summary.decisions?.length ?? 0) > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-slate-500 mb-1">Key decisions:</p>
                      <ul className="space-y-0.5">
                        {analysis.summary.decisions!.map((d, i) => (
                          <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5"><span className="text-indigo-400 mt-0.5">•</span>{d}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── REQUIREMENTS TAB ── */}
          {activeTab === 'requirements' && (
            <div className="p-5 space-y-4">
              {/* Completeness score */}
              {analysis?.completeness_score != null && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-2xl font-black text-violet-600">{analysis.completeness_score}%</div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">Completeness Score</p>
                    <p className="text-xs text-slate-500">How complete the requirements are</p>
                  </div>
                  <div className="flex-1">
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all"
                        style={{ width: `${analysis.completeness_score}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Functional */}
              {frList.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                    ⚙️ Functional Requirements ({frList.length})
                  </h3>
                  <div className="space-y-1.5">
                    {frList.map((r, i) => {
                      const text = getText(r as Record<string, string>)
                      const priority = typeof r === 'object' ? r.priority : undefined
                      return (
                        <div key={i} className="flex items-start gap-2 p-2.5 bg-blue-50 rounded-lg border border-blue-100">
                          <span className="text-xs font-bold text-blue-400 shrink-0 mt-0.5">FR{i + 1}</span>
                          {priority && (
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              priority === 'high' ? 'bg-red-100 text-red-600' :
                              priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>{priority}</span>
                          )}
                          <span className="text-sm text-slate-700">{text}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Non-functional */}
              {nfrList.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                    🔧 Non-Functional Requirements ({nfrList.length})
                  </h3>
                  <div className="space-y-1.5">
                    {nfrList.map((r, i) => {
                      const text = getText(r as Record<string, string>)
                      return (
                        <div key={i} className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="text-xs font-bold text-slate-400 shrink-0 mt-0.5">NFR{i + 1}</span>
                          <span className="text-sm text-slate-700">{text}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {frList.length === 0 && nfrList.length === 0 && status !== 'analyzing' && (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-3xl mb-2">📋</p>
                  <p className="text-sm">No requirements extracted yet.</p>
                  {rawTranscript && <button onClick={() => analyzeTranscript(rawTranscript)} className="mt-3 text-xs px-4 py-1.5 bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 font-semibold">Run Analysis</button>}
                </div>
              )}
            </div>
          )}

          {/* ── ANALYSIS TAB ── */}
          {activeTab === 'analysis' && (
            <div className="p-5 space-y-4">
              {/* Ambiguities */}
              {ambiguities.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">⚠️ Ambiguities ({ambiguities.length})</h3>
                  <div className="space-y-1.5">
                    {ambiguities.map((a, i) => {
                      const text = getText(a as Record<string, string>)
                      const severity = typeof a === 'object' ? a.severity : undefined
                      return (
                        <div key={i} className="flex items-start gap-2 p-2.5 bg-amber-50 rounded-lg border border-amber-100">
                          {severity && (
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              severity === 'high' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
                            }`}>{severity}</span>
                          )}
                          <span className="text-sm text-slate-700">{text}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {warnings.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">🚨 Warnings ({warnings.length})</h3>
                  <div className="space-y-1.5">
                    {warnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-2 p-2.5 bg-red-50 rounded-lg border border-red-100">
                        <span className="text-red-400 shrink-0">!</span>
                        <span className="text-sm text-slate-700">{getText(w as Record<string, string>)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Clarification questions */}
              {questions.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">❓ Clarification Questions ({questions.length})</h3>
                  <div className="space-y-1.5">
                    {questions.map((q, i) => (
                      <div key={i} className="flex items-start gap-2 p-2.5 bg-sky-50 rounded-lg border border-sky-100">
                        <span className="text-xs font-bold text-sky-400 shrink-0 mt-0.5">Q{i + 1}</span>
                        <span className="text-sm text-slate-700">{getText(q as Record<string, string>)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key insights */}
              {insights.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">💡 Key Insights ({insights.length})</h3>
                  <div className="space-y-1.5">
                    {insights.map((ins, i) => (
                      <div key={i} className="flex items-start gap-2 p-2.5 bg-emerald-50 rounded-lg border border-emerald-100">
                        <span className="text-emerald-400 shrink-0">•</span>
                        <span className="text-sm text-slate-700">{getText(ins as Record<string, string>)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Risk areas */}
              {risks.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">🎯 Risk Areas ({risks.length})</h3>
                  <div className="space-y-1.5">
                    {risks.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 p-2.5 bg-rose-50 rounded-lg border border-rose-100">
                        <span className="text-rose-400 shrink-0">▲</span>
                        <span className="text-sm text-slate-700">{getText(r as Record<string, string>)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {ambiguities.length === 0 && questions.length === 0 && insights.length === 0 && status !== 'analyzing' && (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-3xl mb-2">🔍</p>
                  <p className="text-sm">No analysis data available yet.</p>
                </div>
              )}
            </div>
          )}

          {/* ── ARCHITECTURE TAB ── */}
          {activeTab === 'architecture' && (
            <div className="p-5 space-y-4">
              {arch ? (
                <>
                  {arch.architecture_style && (
                    <div className="p-3 bg-violet-50 border border-violet-100 rounded-xl">
                      <p className="text-xs font-bold text-violet-600 mb-1">Architecture Style</p>
                      <p className="text-sm font-semibold text-slate-700">{arch.architecture_style}</p>
                    </div>
                  )}
                  {(arch.system_layers?.length ?? 0) > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">System Layers</h3>
                      <div className="space-y-1">
                        {arch.system_layers!.map((l, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-700">
                            <span className="w-5 h-5 bg-violet-100 text-violet-600 rounded text-xs font-bold flex items-center justify-center">{i + 1}</span>
                            {l}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(arch.api_endpoints?.length ?? 0) > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">API Endpoints ({arch.api_endpoints!.length})</h3>
                      <div className="space-y-1">
                        {arch.api_endpoints!.map((ep, i) => (
                          <div key={i} className="p-2 bg-slate-50 rounded-lg border border-slate-200 font-mono text-xs text-slate-700">{ep}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(arch.database_schema?.length ?? 0) > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Database Entities</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {arch.database_schema!.map((entity, i) => (
                          <span key={i} className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-lg text-xs font-semibold text-indigo-700">{entity}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {arch.technology_stack && Object.keys(arch.technology_stack).length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Technology Stack</h3>
                      <div className="grid grid-cols-2 gap-1.5">
                        {Object.entries(arch.technology_stack).map(([layer, tech]) => (
                          <div key={layer} className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                            <p className="text-xs font-bold text-slate-500">{layer}</p>
                            <p className="text-sm text-slate-700">{tech}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-3xl mb-2">🏗️</p>
                  <p className="text-sm">Architecture analysis not yet available.</p>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!rawTranscript && !analysis && status === 'idle' && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <div className="text-5xl mb-4">🎙️</div>
              <p className="text-sm font-semibold text-slate-500">Record a meeting or paste a transcript</p>
              <p className="text-xs mt-1">The AI will extract requirements, detect ambiguities, and prepare a prompt for UI generation</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between bg-slate-50 shrink-0">
          <span className="text-xs text-slate-400">
            {status === 'done' && (frList.length + nfrList.length > 0)
              ? `${frList.length} functional + ${nfrList.length} non-functional requirements`
              : rawTranscript
              ? 'Transcript ready'
              : 'Record or paste a transcript'}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600"
            >
              Cancel
            </button>
            <button
              onClick={() => { onRequirementsExtracted(buildPrompt()); onClose() }}
              disabled={!rawTranscript.trim()}
              className="px-4 py-1.5 text-sm bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 text-white rounded-lg font-semibold flex items-center gap-1.5"
            >
              ✨ Generate UI
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MeetingRecorder
