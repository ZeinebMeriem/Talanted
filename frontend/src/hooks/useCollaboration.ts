import { useEffect, useRef, useState, useCallback } from 'react'
import { Client, IMessage } from '@stomp/stompjs'

const WS_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8081')
  .replace(/^http/, 'ws') + '/ws/collab'

export interface CollabEvent {
  type: 'cursor' | 'edit' | 'presence' | 'lock' | 'unlock' | 'join' | 'leave'
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

export interface ProjectLock {
  lockedBy: string
}

export function useCollaboration({ projectId, userName, enabled = true }: UseCollaborationOptions) {
  const clientRef = useRef<Client | null>(null)
  const [connected, setConnected] = useState(false)
  const [activeUsers, setActiveUsers] = useState<string[]>([])
  const [lastEvent, setLastEvent] = useState<CollabEvent | null>(null)
  const [projectLock, setProjectLock] = useState<ProjectLock | null>(null)

  const send = useCallback((type: string, data: unknown) => {
    const client = clientRef.current
    if (!client?.connected) return
    client.publish({
      destination: `/app/project/${projectId}/event`,
      body: JSON.stringify({ type, projectId, userId: userName, userName, data }),
    })
  }, [projectId, userName])

  const lockProject = useCallback(() => send('lock', {}), [send])
  const unlockProject = useCallback(() => send('unlock', {}), [send])

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
              const pd = event.data as PresenceData & { locked?: boolean; lockedBy?: string }
              setActiveUsers(pd.users ?? [])
              if (pd.locked !== undefined) {
                setProjectLock(pd.locked && pd.lockedBy ? { lockedBy: pd.lockedBy } : null)
              }
            } else if (event.type === 'lock') {
              const d = event.data as any
              setProjectLock(d.locked ? { lockedBy: d.lockedBy } : null)
            } else if (event.type === 'unlock') {
              setProjectLock(null)
            }
          } catch {
            // ignore malformed messages
          }
        })
        // Announce presence — server-side @SubscribeMapping doesn't fire on /topic
        // subscriptions, so we send an explicit join event with our real userName
        client.publish({
          destination: `/app/project/${projectId}/join`,
          body: JSON.stringify({ type: 'join', projectId, userId: userName, userName, data: {} }),
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
          body: JSON.stringify({ type: 'leave', projectId, userId: userName, userName, data: {} }),
        })
      }
      client.deactivate()
      clientRef.current = null
      setConnected(false)
    }
  }, [projectId, enabled])

  return { connected, activeUsers, lastEvent, send, projectLock, lockProject, unlockProject }
}
