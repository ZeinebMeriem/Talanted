import { useState, useCallback, useRef, useEffect } from 'react'
import { tedSendMessage, tedGetSuggestions, editFile, type TedContext, type TedMessage as TedMessageType, type TedSuggestion as TedSuggestionType } from '../api'

export type TedMode = 'explain' | 'fix' | 'improve' | 'generate'

export type TedMessage = TedMessageType & { mode?: TedMode }
export type TedSuggestion = TedSuggestionType

const GREETING: TedMessage = {
  id: '1',
  type: 'bot',
  text: "Hey! I'm TED, your UI assistant. What do you want to do — explain, fix, improve or generate code? 🚀",
  timestamp: new Date(),
}

const storageKey = (id: string) => `ted_chat_${id}`

function loadMessages(generationId: string): TedMessage[] {
  try {
    const raw = localStorage.getItem(storageKey(generationId))
    if (!raw) return [GREETING]
    const parsed = JSON.parse(raw) as TedMessage[]
    // Restore Date objects
    return parsed.map(m => ({ ...m, timestamp: new Date(m.timestamp) }))
  } catch {
    return [GREETING]
  }
}

function saveMessages(generationId: string, msgs: TedMessage[]) {
  try {
    // Keep last 100 messages to avoid hitting storage limits
    localStorage.setItem(storageKey(generationId), JSON.stringify(msgs.slice(-100)))
  } catch { /* storage full — ignore */ }
}

interface UseTedOptions {
  accessToken?: string
  enabled?: boolean
  generationId?: string
}

export const useTed = ({ accessToken, enabled = true, generationId }: UseTedOptions) => {
  const [messages, setMessages] = useState<TedMessage[]>(() =>
    generationId ? loadMessages(generationId) : [GREETING]
  )

  // Load history when project changes
  useEffect(() => {
    if (generationId) {
      setMessages(loadMessages(generationId))
    } else {
      setMessages([GREETING])
    }
  }, [generationId])

  // Save history whenever messages change
  useEffect(() => {
    if (generationId && messages.length > 0) {
      saveMessages(generationId, messages)
    }
  }, [generationId, messages])

  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<TedSuggestion[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const tedContext = useRef<TedContext>({})
  const suggestionDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /**
   * Update TED context (what user is currently doing)
   */
  const updateContext = useCallback((newContext: Partial<TedContext>) => {
    tedContext.current = { ...tedContext.current, ...newContext }

    // Trigger suggestions after 3 seconds of inactivity
    if (suggestionDebounceTimer.current) {
      clearTimeout(suggestionDebounceTimer.current)
    }

    suggestionDebounceTimer.current = setTimeout(async () => {
      if (!enabled || !accessToken) return
      try {
        const sug = await tedGetSuggestions(tedContext.current, accessToken)
        setSuggestions(sug || [])
      } catch (error) {
        console.warn('Failed to get TED suggestions:', error)
      }
    }, 3000)
  }, [enabled, accessToken])

  /**
   * Send a message to TED
   */
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || !enabled || !accessToken) return

      // Add user message
      const userMessage: TedMessageType = {
        id: `user-${Date.now()}`,
        type: 'user',
        text,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)
      setIsTyping(true)
      setSuggestions([]) // Clear suggestions when user sends message

      try {
        // Convert messages to history format for API (skip greeting message)
        const conversationHistory = messages
          .filter((m) => m.id !== '1') // Skip initial greeting
          .map((m) => ({
            type: m.type as 'user' | 'bot',
            text: m.text,
            mode: (m as TedMessage).mode,
          }))

        // Get response from TED
        const response = await tedSendMessage(text, tedContext.current, accessToken, conversationHistory)

        setIsTyping(false)

        // Simulate typing delay for better UX
        await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000))

        // Add bot message
        const botMessage: TedMessage = {
          id: `bot-${Date.now()}`,
          type: 'bot',
          text: response.response,
          timestamp: new Date(),
          actionSteps: response.actionSteps,
          mode: (response as any).mode as TedMode,
        }

        setMessages((prev) => [...prev, botMessage])

        // Show suggestions if any
        if (response.suggestions && response.suggestions.length > 0) {
          setSuggestions(response.suggestions)
        }

        // Play notification sound
        playNotificationSound()
      } catch (error) {
        console.error('Failed to send message to TED:', error)
        setIsTyping(false)

        const errorMessage: TedMessage = {
          id: `bot-error-${Date.now()}`,
          type: 'bot',
          text: "Sorry, something went wrong. Please try again! 🔧",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMessage])
      } finally {
        setIsLoading(false)
      }
    },
    [enabled, accessToken, messages],
  )

  /**
   * Apply a suggestion (click quick action)
   */
  const applySuggestion = useCallback(
    (suggestion: TedSuggestionType) => {
      sendMessage(suggestion.action)
    },
    [sendMessage],
  )

  /**
   * Play notification sound when TED responds
   */
  const playNotificationSound = useCallback(() => {
    try {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      // Set sound properties
      oscillator.frequency.value = 800 // Hz
      oscillator.type = 'sine'

      // Envelope (attack, decay)
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
    } catch (error) {
      // Silently fail if audio context not available
      console.debug('Audio notification not available')
    }
  }, [])

  /**
   * Apply a TED suggestion directly to the code via edit-file API
   */
  const applyToCode = useCallback(
    async (
      suggestion: TedSuggestionType,
      generationId: string,
      onSuccess?: () => void,
    ) => {
      if (!suggestion.file || !suggestion.instruction || !accessToken) return

      const applyingMsg: TedMessageType = {
        id: `bot-applying-${Date.now()}`,
        type: 'bot',
        text: `Applying: ${suggestion.title} to \`${suggestion.file}\`...`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, applyingMsg])
      setIsLoading(true)

      try {
        await editFile(generationId, suggestion.file, suggestion.instruction, accessToken)

        const doneMsg: TedMessageType = {
          id: `bot-done-${Date.now()}`,
          type: 'bot',
          text: `✅ Applied! \`${suggestion.file}\` has been updated. The preview will reload automatically.`,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, doneMsg])
        onSuccess?.()
      } catch (err: any) {
        const isAuth = err?.message?.includes('401')
        const isRateLimit = err?.message?.includes('429') || err?.message?.toLowerCase().includes('rate limit') || err?.message?.toLowerCase().includes('too many')
        const errMsg: TedMessageType = {
          id: `bot-err-${Date.now()}`,
          type: 'bot',
          text: isAuth
            ? '⚠️ Session expired. Please refresh the page and try again.'
            : isRateLimit
              ? '⏳ AI rate limit reached — wait a few seconds and try again.'
              : `❌ Could not apply: ${err?.message?.split(':')[0] ?? 'unknown error'}. Try copying the code manually.`,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errMsg])
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken],
  )

  /**
   * Clear chat history
   */
  const clearMessages = useCallback(() => {
    const reset: TedMessage = {
      id: `1-${Date.now()}`,
      type: 'bot',
      text: "Chat cleared. What would you like to work on? 🚀",
      timestamp: new Date(),
    }
    setMessages([reset])
    setSuggestions([])
    if (generationId) localStorage.removeItem(storageKey(generationId))
  }, [generationId])

  return {
    messages,
    isLoading,
    isTyping,
    suggestions,
    sendMessage,
    updateContext,
    applySuggestion,
    applyToCode,
    clearMessages,
    playNotificationSound,
  }
}
