import React, { useCallback, useRef, useEffect } from 'react'
import { editFile, type EditFileResponse } from './api'

export type ChatMsg = {
  role: 'ai' | 'user'
  text: string
  edits?: { file: string; added: number; removed: number }[]
}

interface ChatPanelProps {
  chatMessages: ChatMsg[]
  chatInput: string
  setChatInput: (value: string) => void
  isChatLoading: boolean
  selectedGenerationId: string | null
  selectedZone: { label: string; description: string } | null
  diffVisible: boolean
  setDiffVisible: (visible: boolean) => void
  diffEdits: { file: string; added: number; removed: number }[]
  setDiffEdits: (edits: { file: string; added: number; removed: number }[]) => void
  accessToken: string
  selectedModel: string
  onFileUpdated: (updatedMessages: ChatMsg[], edits: { file: string; added: number; removed: number }[]) => void
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  chatMessages,
  chatInput,
  setChatInput,
  isChatLoading,
  selectedGenerationId,
  selectedZone,
  diffVisible,
  setDiffVisible,
  diffEdits,
  setDiffEdits,
  accessToken,
  selectedModel,
  onFileUpdated,
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [chatMessages])

  const sendChat = useCallback(async () => {
    if (!chatInput.trim() || !selectedGenerationId) return

    const userMsg: ChatMsg = { role: 'user', text: chatInput }
    setChatInput('')

    try {
      const response = await editFile(selectedGenerationId, '', chatInput, selectedModel, accessToken)

      const edits = response.edits?.map((e) => ({
        file: e.file,
        added: e.added_lines,
        removed: e.removed_lines,
      })) || []

      setDiffEdits(edits)

      const aiMsg: ChatMsg = {
        role: 'ai',
        text: response.message || 'Changes applied.',
        edits: edits.length > 0 ? edits : undefined,
      }

      const newMessages = [...chatMessages, userMsg, aiMsg]
      onFileUpdated(newMessages, edits)
      setDiffVisible(edits.length > 0)
    } catch (e: any) {
      const errorMsg: ChatMsg = {
        role: 'ai',
        text: `Error: ${e?.message || 'Failed to process request'}`,
      }
      onFileUpdated([...chatMessages, userMsg, errorMsg], [])
    }
  }, [chatInput, selectedGenerationId, selectedModel, accessToken, chatMessages, onFileUpdated, setDiffEdits, setDiffVisible, setChatInput])

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-xs px-4 py-2 rounded-lg ${
                msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-100'
              }`}
            >
              <p className="text-sm">{msg.text}</p>
              {msg.edits && msg.edits.length > 0 && (
                <div className="text-xs mt-2 opacity-75">
                  {msg.edits.map((e, i) => (
                    <div key={i}>
                      {e.file}: +{e.added} -{e.removed}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isChatLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-700 text-slate-100 px-4 py-2 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Zone selector (if in inspect mode) */}
      {selectedZone && (
        <div className="px-4 py-2 bg-slate-700 border-t border-slate-600">
          <div className="text-xs text-slate-300">
            <strong>{selectedZone.label}</strong>: {selectedZone.description}
          </div>
        </div>
      )}

      {/* Diff display */}
      {diffVisible && diffEdits.length > 0 && (
        <div className="px-4 py-2 bg-green-900 bg-opacity-20 border-t border-green-600 text-xs text-green-300">
          <div className="font-semibold mb-1">Changes applied to:</div>
          {diffEdits.map((e, i) => (
            <div key={i} className="ml-2">
              📄 {e.file}: <span className="text-green-400">+{e.added}</span> <span className="text-red-400">-{e.removed}</span>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-slate-700 bg-slate-800">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="What would you like to change?"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendChat()
              }
            }}
            disabled={isChatLoading || !selectedGenerationId}
            className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white placeholder-slate-400 disabled:opacity-50"
          />
          <button
            onClick={sendChat}
            disabled={!chatInput.trim() || isChatLoading || !selectedGenerationId}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
