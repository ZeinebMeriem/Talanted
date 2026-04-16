import { useState, useCallback, useRef, useEffect } from 'react'
import { tedSendMessage, tedGetSuggestions, type TedContext, type TedMessage as TedMessageType, type TedSuggestion as TedSuggestionType } from '../api'

export type TedMessage = TedMessageType
export type TedSuggestion = TedSuggestionType

interface UseTedOptions {
  accessToken?: string
  enabled?: boolean
}

export const useTed = ({ accessToken, enabled = true }: UseTedOptions) => {
  const [messages, setMessages] = useState<TedMessage[]>([
    {
      id: '1',
      type: 'bot',
      text: "Hey! I'm TED, your AI generation assistant. I'm here to help you build amazing UIs! 🚀",
      timestamp: new Date(),
    },
  ])

  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<TedSuggestion[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const tedContext = useRef<TedContext>({})
  const suggestionDebounceTimer = useRef<NodeJS.Timeout | null>(null)

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
          text: "Sorry, I encountered an error. Let me try again in a moment! 🔧",
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
   * Clear chat history
   */
  const clearMessages = useCallback(() => {
    setMessages([
      {
        id: '1',
        type: 'bot',
        text: "I've cleared our chat history. What would you like to work on? 🚀",
        timestamp: new Date(),
      },
    ])
    setSuggestions([])
  }, [])

  return {
    messages,
    isLoading,
    isTyping,
    suggestions,
    sendMessage,
    updateContext,
    applySuggestion,
    clearMessages,
    playNotificationSound,
  }
}
