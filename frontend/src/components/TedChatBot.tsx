import React, { useEffect, useRef } from 'react'
import { Bot, Zap, Sparkles, Moon, Sun, RotateCcw, X, SendHorizonal, Lightbulb } from 'lucide-react'
import { useTed, type TedMessage, type TedSuggestion } from '../hooks/useTed'

interface TedChatBotProps {
  isOpen: boolean
  onClose: () => void
  accessToken?: string
  generationId?: string
  currentFile?: string
  fileCount?: number
  fileContent?: string
  allFiles?: Array<{ path: string; content: string }>
  onFileApplied?: () => void
}

export const TedChatBot: React.FC<TedChatBotProps> = ({
  isOpen,
  onClose,
  accessToken,
  generationId,
  currentFile,
  fileCount,
  fileContent,
  allFiles,
  onFileApplied,
}) => {
  const [input, setInput] = React.useState('')
  const [darkMode, setDarkMode] = React.useState(false)
  const [applyingId, setApplyingId] = React.useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { messages, isLoading, isTyping, suggestions, sendMessage, updateContext, applySuggestion, applyToCode, clearMessages } = useTed({
    accessToken,
    enabled: isOpen,
    generationId: generationId ?? undefined,
  })

  // Update TED context when props change
  useEffect(() => {
    if (isOpen) {
      updateContext({
        generationId,
        currentFile,
        fileCount,
        fileContent,
        allFiles,
        action: 'previewing',
      })
    }
  }, [isOpen, generationId, currentFile, fileCount, fileContent, allFiles, updateContext])

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleSendMessage = () => {
    if (input.trim() && !isLoading) {
      sendMessage(input)
      setInput('')
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Chat Modal */}
      <div className={`fixed bottom-4 right-4 w-full max-w-md h-[650px] rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden transition-all ${
        darkMode ? 'bg-slate-900' : 'bg-white'
      }`} style={{ boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)' }}>

        {/* Header with Avatar Section */}
        <div className={`${darkMode ? 'bg-gradient-to-br from-blue-600 to-blue-700' : 'bg-gradient-to-br from-blue-600 to-cyan-600'} text-white px-6 py-5 flex items-center justify-between`}>
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-all"
              title="Minimize"
            >
              <span className="text-lg">−</span>
            </button>

            {/* Avatar with badge */}
            <div className="relative">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold shadow-lg text-lg ${
                darkMode ? 'bg-blue-500' : 'bg-white/20 backdrop-blur-sm border border-white/30'
              }`}>
                <Bot size={20} className="text-white" />
              </div>
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white"></div>
            </div>

            <div className="flex-1">
              <h2 className="font-bold text-base">Chat with TED</h2>
              <div className="flex items-center gap-2">
                <p className="text-xs text-blue-100">Online • AI Assistant</p>
                {messages.length > 1 && (() => {
                  const lastBot = [...messages].reverse().find(m => m.type === 'bot' && (m as any).mode)
                  const mode = (lastBot as any)?.mode
                  if (!mode) return null
                  const modeConfig: Record<string, { label: string; color: string }> = {
                    explain: { label: 'Explain', color: 'bg-blue-400/30' },
                    fix:     { label: 'Fix',     color: 'bg-red-400/30' },
                    improve: { label: 'Improve',  color: 'bg-yellow-400/30' },
                    generate:{ label: 'Generate', color: 'bg-green-400/30' },
                  }
                  const cfg = modeConfig[mode]
                  return cfg ? (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color} text-white`}>
                      {cfg.label}
                    </span>
                  ) : null
                })()}
              </div>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Toggle theme"
            >
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              onClick={() => clearMessages()}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Clear chat"
            >
              <RotateCcw size={15} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Close"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className={`flex-1 overflow-y-auto p-5 space-y-4 ${
          darkMode ? 'bg-slate-800' : 'bg-gray-50'
        }`}>
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              darkMode={darkMode}
              generationId={generationId}
              accessToken={accessToken}
              onFileApplied={onFileApplied}
            />
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                <Bot size={16} className="text-white" />
              </div>
              <div className={`flex gap-1.5 items-center px-4 py-2.5 rounded-2xl ${
                darkMode ? 'bg-slate-700' : 'bg-white border border-gray-200'
              }`}>
                <div className={`w-2 h-2 rounded-full animate-bounce ${darkMode ? 'bg-blue-400' : 'bg-blue-600'}`} />
                <div className={`w-2 h-2 rounded-full animate-bounce delay-100 ${darkMode ? 'bg-blue-400' : 'bg-blue-600'}`} />
                <div className={`w-2 h-2 rounded-full animate-bounce delay-200 ${darkMode ? 'bg-blue-400' : 'bg-blue-600'}`} />
              </div>
            </div>
          )}

          {/* Quick mode shortcuts */}
          {messages.length === 1 && !isLoading && (
            <div className="mt-4 flex flex-wrap gap-2">
              <QuickReplyButton text="Explain code" onClick={() => sendMessage('Explain how this component works')} darkMode={darkMode} />
              <QuickReplyButton text="Fix a bug" onClick={() => sendMessage('I have a bug, which component or file?')} darkMode={darkMode} />
              <QuickReplyButton text="Improve" onClick={() => sendMessage('Improve the current file performance')} darkMode={darkMode} />
              <QuickReplyButton text="Generate" onClick={() => sendMessage('Generate a new component')} darkMode={darkMode} />
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && !isLoading && (
            <div className="mt-6 space-y-2">
              <div className="px-2 text-xs font-semibold text-gray-500 flex items-center gap-1.5"><Lightbulb size={12} /> Suggestions</div>
              {suggestions.map((suggestion) => (
                <SuggestionButton
                  key={suggestion.id}
                  suggestion={suggestion}
                  applying={applyingId === suggestion.id}
                  onAsk={() => applySuggestion(suggestion)}
                  onApply={(() => {
                    // Try to extract file from suggestion.file OR from description text
                    const fileFromDesc = !suggestion.file
                      ? (suggestion.description?.match(/\(?((?:src\/)?[^\s(),]+\.(?:tsx?|py|jsx?))\)?/)?.[1] ?? null)
                      : null
                    const resolvedFile = suggestion.file || fileFromDesc
                    const resolvedInstruction = suggestion.instruction || suggestion.action || suggestion.description
                    if (!resolvedFile || !resolvedInstruction) return undefined
                    return async () => {
                      if (!generationId) { alert('Open a project first to apply changes.'); return }
                      setApplyingId(suggestion.id)
                      await applyToCode({ ...suggestion, file: resolvedFile, instruction: resolvedInstruction }, generationId, onFileApplied)
                      setApplyingId(null)
                    }
                  })()}
                  darkMode={darkMode}
                />
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className={`border-t px-5 py-4 transition-colors ${
          darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-200'
        }`}>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                placeholder="Explique, corrige, améliore ou génère..."
                disabled={isLoading}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all text-sm ${
                  darkMode
                    ? 'bg-slate-600 border-slate-500 text-white placeholder-slate-400 focus:border-blue-400 focus:ring-blue-400/20'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-100'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              />
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 px-2"
                title="Emoji"
              >
                <Sparkles size={14} />
              </button>
            </div>
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              className={`px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center flex-shrink-0 ${
                darkMode
                  ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600'
                  : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300'
              } text-white disabled:cursor-not-allowed shadow-lg hover:shadow-xl`}
              title="Send message (Enter)"
            >
              <SendHorizonal size={16} />
            </button>
          </div>
          <p className={`text-xs mt-3 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            Explain · Fix · Improve · Generate
          </p>
        </div>
      </div>
    </>
  )
}

/**
 * Message Bubble Component
 */
interface MessageBubbleProps {
  message: TedMessage
  darkMode: boolean
  generationId?: string
  accessToken?: string
  onFileApplied?: () => void
}

/** Split text into plain text and code block segments */
function parseMessageSegments(text: string): Array<{ type: 'text' | 'code'; content: string; lang?: string }> {
  const segments: Array<{ type: 'text' | 'code'; content: string; lang?: string }> = []
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, match.index) })
    }
    segments.push({ type: 'code', lang: match[1] || 'code', content: match[2].trim() })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) })
  }
  return segments
}

/** Extract file path from TED response: 📁 **File: `path`** */
function extractFilePath(text: string): string | null {
  // Match "File: `src/App.tsx`" or "Fichier : `App.tsx`"
  const match = text.match(/(?:File|Fichier)\s*:\s*[`']?([\w./\-]+\.(?:tsx?|py|jsx?|css|json))[`']?/i)
  return match ? match[1] : null
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, darkMode, generationId, accessToken, onFileApplied }) => {
  const isUser = message.type === 'user'
  const [copiedIdx, setCopiedIdx] = React.useState<number | null>(null)
  const [applyingIdx, setApplyingIdx] = React.useState<number | null>(null)
  const [appliedIdx, setAppliedIdx] = React.useState<number | null>(null)
  const segments = parseMessageSegments(message.text)
  const filePath = !isUser ? extractFilePath(message.text) : null

  const handleCopy = (code: string, idx: number) => {
    navigator.clipboard.writeText(code)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 1500)
  }

  const handleApply = async (code: string, idx: number) => {
    if (!filePath || !accessToken) return
    if (!generationId) {
      alert('Ouvre un projet pour pouvoir appliquer ce fix.')
      return
    }
    setApplyingIdx(idx)
    try {
      const { editFile } = await import('../api')
      await editFile(generationId, filePath, `Apply this exact code to the file:\n\n\`\`\`\n${code}\n\`\`\``, accessToken)
      setAppliedIdx(idx)
      onFileApplied?.()
    } catch (e: any) {
      console.error('Apply failed:', e)
      if (e?.message?.includes('401')) {
        alert('Session expired. Please refresh the page.')
      }
    } finally {
      setApplyingIdx(null)
    }
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div className={`flex gap-2.5 max-w-sm ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isUser && (
          <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm shadow-md">
            🤖
          </div>
        )}
        <div
          className={`px-4 py-3 rounded-2xl ${
            isUser
              ? 'bg-blue-600 text-white rounded-br-none shadow-lg'
              : darkMode
                ? 'bg-slate-700 text-gray-100 rounded-bl-none border border-slate-600'
                : 'bg-gray-200 text-gray-900 rounded-bl-none border border-gray-300'
          }`}
        >
          {/* Render text + code blocks */}
          {segments.map((seg, idx) =>
            seg.type === 'code' ? (
              <div key={idx} className="my-2 rounded-lg overflow-hidden border border-black/20">
                {/* Code header */}
                <div className={`flex items-center justify-between px-3 py-1 text-xs font-mono ${darkMode ? 'bg-slate-900 text-slate-300' : 'bg-gray-800 text-gray-300'}`}>
                  <span>{seg.lang}{filePath ? ` · ${filePath.split('/').pop()}` : ''}</span>
                  <div className="flex items-center gap-2">
                    {filePath && accessToken && (
                      <button
                        onClick={() => handleApply(seg.content, idx)}
                        disabled={applyingIdx === idx || appliedIdx === idx}
                        className="text-green-400 hover:text-green-300 disabled:opacity-60 transition-colors font-medium"
                      >
                        {appliedIdx === idx ? '✓ Applied' : applyingIdx === idx ? '…' : <><Zap size={11} /> Apply</>}
                      </button>
                    )}
                    <button onClick={() => handleCopy(seg.content, idx)} className="hover:text-white transition-colors">
                      {copiedIdx === idx ? '✓ Copié' : '⎘ Copier'}
                    </button>
                  </div>
                </div>
                {/* Code body */}
                <pre className={`px-3 py-2 text-xs overflow-x-auto leading-relaxed ${darkMode ? 'bg-slate-950 text-green-300' : 'bg-gray-900 text-green-300'}`}>
                  <code>{seg.content}</code>
                </pre>
              </div>
            ) : (
              <p key={idx} className="text-sm leading-relaxed whitespace-pre-wrap">{seg.content}</p>
            )
          )}

          {/* Action Steps */}
          {message.actionSteps && message.actionSteps.length > 0 && (
            <div className={`mt-3 space-y-1.5 text-xs ${isUser ? 'text-blue-100' : ''}`}>
              <div className="font-semibold opacity-70">Steps:</div>
              {message.actionSteps.map((step, idx) => (
                <div key={idx} className="flex gap-2 ml-2 opacity-80">
                  <span className="font-bold">→</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          )}

          <span className={`text-xs mt-3 block opacity-70 ${isUser ? 'text-blue-100' : ''}`}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Suggestion Button Component
 */
interface SuggestionButtonProps {
  suggestion: TedSuggestion
  applying: boolean
  onAsk: () => void
  onApply?: () => void
  darkMode: boolean
}

const SuggestionButton: React.FC<SuggestionButtonProps> = ({ suggestion, applying, onAsk, onApply, darkMode }) => {
  return (
    <div className={`w-full px-4 py-3 border rounded-xl ${
      darkMode ? 'bg-blue-600/20 border-blue-500/50' : 'bg-blue-50 border-blue-200'
    }`}>
      <div className="flex items-start gap-3">
        <span className="text-lg mt-0.5 flex-shrink-0">{suggestion.icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm ${darkMode ? 'text-blue-100' : 'text-blue-900'}`}>{suggestion.title}</p>
          <p className={`text-xs mt-1 ${darkMode ? 'text-blue-200/70' : 'text-blue-700'}`}>{suggestion.description}</p>
          {suggestion.file && (
            <p className={`text-xs mt-1 font-mono ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{suggestion.file}</p>
          )}
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={onAsk}
          className={`flex-1 text-xs py-1.5 px-3 rounded-lg border font-medium transition-all ${
            darkMode ? 'border-blue-400 text-blue-200 hover:bg-blue-600/30' : 'border-blue-300 text-blue-700 hover:bg-blue-100'
          }`}
        >
          Ask TED
        </button>
        {onApply && (
          <button
            onClick={onApply}
            disabled={applying}
            className={`flex-1 text-xs py-1.5 px-3 rounded-lg font-medium transition-all disabled:opacity-60 ${
              darkMode ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {applying ? 'Applying…' : <span className="flex items-center gap-1 justify-center"><Zap size={11} /> Apply</span>}
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Quick Reply Button Component
 */
interface QuickReplyButtonProps {
  text: string
  onClick: () => void
  darkMode: boolean
}

const QuickReplyButton: React.FC<QuickReplyButtonProps> = ({ text, onClick, darkMode }) => {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
        darkMode
          ? 'bg-blue-600/20 border-blue-500/50 text-blue-100 hover:bg-blue-600/40'
          : 'bg-white border-blue-300 text-blue-700 hover:bg-blue-50'
      }`}
    >
      {text}
    </button>
  )
}
