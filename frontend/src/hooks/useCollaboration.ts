import { useEffect, useRef, useState, useCallback } from 'react'
import { Client, IMessage } from '@stomp/stompjs'

const WS_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8081')
  .replace(/^http/, 'ws') + '/ws/collab'

export interface CollabEvent {
  type: 'cursor' | 'edit' | 'presence'
  projectId: string
  userId: string
  userName: string
  data: unknown
  timestamp: string
}

export interface PresenceData {
  action: 'join' | 'leave'
  users: string[]
}

interface UseCollaborationOptions {
  projectId: string
  userName: string
  enabled?: boolean
}

export function useCollaboration({ projectId, userName, enabled = true }: UseCollaborationOptions) {
  const clientRef = useRef<Client | null>(null)
  const [connected, setConnected] = useState(false)
  const [activeUsers, setActiveUsers] = useState<string[]>([])
  const [lastEvent, setLastEvent] = useState<CollabEvent | null>(null)

  const send = useCallback((type: CollabEvent['type'], data: unknown) => {
    const client = clientRef.current
    if (!client?.connected) return
    client.publish({
      destination: `/app/project/${projectId}/event`,
      body: JSON.stringify({ type, projectId, userId: userName, userName, data }),
    })
  }, [projectId, userName])

  useEffect(() => {
    if (!enabled || !projectId) return

    const client = new Client({
      brokerURL: WS_URL,
      reconnectDelay: 3000,
      onConnect: () => {
        setConnected(true)
        // Subscribe to project events
        client.subscribe(`/topic/project/${projectId}/events`, (msg: IMessage) => {
          try {
            const event: CollabEvent = JSON.parse(msg.body)
            setLastEvent(event)
            if (event.type === 'presence') {
              const pd = event.data as PresenceData
              setActiveUsers(pd.users ?? [])
            }
          } catch {
            // ignore malformed messages
          }
        })
      },
      onDisconnect: () => setConnected(false),
      onStompError: () => setConnected(false),
    })

    client.activate()
    clientRef.current = client

    return () => {
      if (client.connected) {
        client.publish({
          destination: `/app/project/${projectId}/leave`,
          body: JSON.stringify({}),
        })
      }
      client.deactivate()
      clientRef.current = null
      setConnected(false)
    }
  }, [projectId, enabled])

  return { connected, activeUsers, lastEvent, send }
}
