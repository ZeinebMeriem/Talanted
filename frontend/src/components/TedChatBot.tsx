import React, { useEffect, useRef } from 'react'
import { useTed, type TedMessage, type TedSuggestion } from '../hooks/useTed'

interface TedChatBotProps {
  isOpen: boolean
  onClose: () => void
  accessToken?: string
  generationId?: string
  currentFile?: string
  fileCount?: number
}

export const TedChatBot: React.FC<TedChatBotProps> = ({
  isOpen,
  onClose,
  accessToken,
  generationId,
  currentFile,
  fileCount,
}) => {
  const [input, setInput] = React.useState('')
  const [darkMode, setDarkMode] = React.useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { messages, isLoading, isTyping, suggestions, sendMessage, updateContext, applySuggestion, clearMessages } = useTed({
    accessToken,
    enabled: isOpen,
  })

  // Update TED context when props change
  useEffect(() => {
    if (isOpen) {
      updateContext({
        generationId,
        currentFile,
        fileCount,
        action: 'previewing',
      })
    }
  }, [isOpen, generationId, currentFile, fileCount, updateContext])

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
      <div className={`fixed bottom-4 right-4 w-full max-w-md h-[650px] rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-slide-up transition-colors ${
        darkMode ? 'bg-slate-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`${darkMode ? 'bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700' : 'bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500'} text-white px-4 py-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              title="Back"
            >
              ◀
            </button>
            <div className="flex items-center gap-2">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold shadow-lg ${
                darkMode ? 'bg-slate-500 text-white' : 'bg-white text-blue-600'
              }`}>
                T
              </div>
              <div>
                <h2 className="font-bold text-lg">TED</h2>
                <p className="text-xs opacity-80">AI Assistant</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Toggle dark mode"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button
              onClick={() => clearMessages()}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Clear chat"
            >
              ☰
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${
          darkMode ? 'bg-slate-900' : 'bg-gradient-to-b from-gray-50 to-white'
        }`}>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <div className="flex gap-1 items-center bg-gray-200 px-4 py-2 rounded-lg">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && !isLoading && (
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 px-2">
                <span>💡</span>
                <p className="text-xs font-semibold text-gray-600">Suggestions</p>
              </div>
              {suggestions.map((suggestion) => (
                <SuggestionButton
                  key={suggestion.id}
                  suggestion={suggestion}
                  onClick={() => applySuggestion(suggestion)}
                />
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className={`border-t p-4 transition-colors ${
          darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-200'
        }`}>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              placeholder="Ask TED anything..."
              disabled={isLoading}
              className={`flex-1 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all text-sm ${
                darkMode
                  ? 'bg-slate-600 border-slate-500 text-white placeholder-slate-400 focus:border-blue-400 focus:ring-blue-400/20'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-100'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              className={`p-3 rounded-xl font-bold transition-colors ${
                darkMode
                  ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-slate-500'
                  : 'bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300'
              } text-white disabled:cursor-not-allowed flex items-center justify-center`}
              title="Send message (Enter)"
            >
              ➤
            </button>
          </div>
          <p className={`text-xs mt-2 ${
            darkMode ? 'text-slate-400' : 'text-gray-400'
          }`}>💡 Tip: TED gives smart suggestions as you work</p>
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
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.type === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div
        className={`flex gap-2 max-w-xs ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      >
        {!isUser && (
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm shadow-md">
            T
          </div>
        )}
        <div
          className={`px-4 py-3 rounded-2xl ${
            isUser
              ? 'bg-blue-500 text-white rounded-br-none shadow-md'
              : 'bg-gray-200 text-gray-900 rounded-bl-none border border-gray-300'
          }`}
        >
          <p className="text-sm leading-relaxed">{message.text}</p>
          <span
            className={`text-xs mt-1 block ${
              isUser ? 'text-blue-100' : 'text-gray-500'
            }`}
          >
            {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
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
  onClick: () => void
}

const SuggestionButton: React.FC<SuggestionButtonProps> = ({ suggestion, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 border border-amber-200 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors text-sm group"
    >
      <div className="flex items-start gap-2">
        <span className="text-lg mt-0.5">{suggestion.icon}</span>
        <div className="flex-1">
          <p className="font-medium text-gray-800 group-hover:text-gray-900">{suggestion.title}</p>
          <p className="text-xs text-gray-600">{suggestion.description}</p>
        </div>
        <span className="text-amber-500 mt-0.5 flex-shrink-0">⚡</span>
      </div>
    </button>
  )
}
