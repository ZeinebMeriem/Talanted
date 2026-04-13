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
                🤖
              </div>
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white"></div>
            </div>

            <div className="flex-1">
              <h2 className="font-bold text-base">Chat with TED</h2>
              <p className="text-xs text-blue-100">Online • AI Assistant</p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Toggle theme"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button
              onClick={() => clearMessages()}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Clear chat"
            >
              🔄
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className={`flex-1 overflow-y-auto p-5 space-y-4 ${
          darkMode ? 'bg-slate-800' : 'bg-gray-50'
        }`}>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} darkMode={darkMode} />
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                <span className="text-white font-bold text-sm">🤖</span>
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

          {/* Quick Reply Buttons (show after first message) */}
          {messages.length > 1 && !isLoading && suggestions.length === 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              <QuickReplyButton text="Yes, sure!" onClick={() => sendMessage('Yes, sounds good!')} darkMode={darkMode} />
              <QuickReplyButton text="No, thanks." onClick={() => sendMessage('No, Im good for now.')} darkMode={darkMode} />
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && !isLoading && (
            <div className="mt-6 space-y-2">
              <div className="px-2 text-xs font-semibold text-gray-500">💡 Suggestions</div>
              {suggestions.map((suggestion) => (
                <SuggestionButton
                  key={suggestion.id}
                  suggestion={suggestion}
                  onClick={() => applySuggestion(suggestion)}
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
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                placeholder="Enter your message..."
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
                😊
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
              ➤
            </button>
          </div>
          <p className={`text-xs mt-3 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            💡 Tip: Ask TED for help with your UI generation
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
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, darkMode }) => {
  const isUser = message.type === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div className={`flex gap-2.5 max-w-xs ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
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
          <p className="text-sm leading-relaxed">{message.text}</p>
          <span
            className={`text-xs mt-2 block opacity-70 ${
              isUser ? 'text-blue-100' : ''
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
  darkMode: boolean
}

const SuggestionButton: React.FC<SuggestionButtonProps> = ({ suggestion, onClick, darkMode }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border rounded-xl transition-all group ${
        darkMode
          ? 'bg-blue-600/20 border-blue-500/50 hover:bg-blue-600/40 hover:border-blue-400'
          : 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg mt-0.5 flex-shrink-0">{suggestion.icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm ${darkMode ? 'text-blue-100' : 'text-blue-900'}`}>{suggestion.title}</p>
          <p className={`text-xs mt-1 ${darkMode ? 'text-blue-200/70' : 'text-blue-700'}`}>{suggestion.description}</p>
        </div>
      </div>
    </button>
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
