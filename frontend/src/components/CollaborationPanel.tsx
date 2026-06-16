import React, { useEffect } from 'react'
import { useCollaboration, CollabEvent } from '../hooks/useCollaboration'

interface CollaborationPanelProps {
  projectId: string
  userName: string
  onRemoteEdit?: (event: CollabEvent) => void
}

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')

  const colors = [
    'bg-violet-500', 'bg-blue-500', 'bg-emerald-500',
    'bg-rose-500', 'bg-amber-500', 'bg-cyan-500',
  ]
  const color = colors[name.charCodeAt(0) % colors.length]

  return (
    <div
      className={`w-8 h-8 rounded-full ${color} flex items-center justify-center text-white text-xs font-bold ring-2 ring-white`}
      title={name}
    >
      {initials || '?'}
    </div>
  )
}

export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  projectId,
  userName,
  onRemoteEdit,
}) => {
  const { connected, activeUsers, lastEvent, send } = useCollaboration({
    projectId,
    userName,
    enabled: !!projectId,
  })

  // Forward remote edit events to parent (e.g. to refresh code viewer)
  useEffect(() => {
    if (!lastEvent || lastEvent.userName === userName) return
    if (lastEvent.type === 'edit' && onRemoteEdit) {
      onRemoteEdit(lastEvent)
    }
  }, [lastEvent, userName, onRemoteEdit])

  const others = activeUsers.filter(u => u !== userName)

  return (
    <div className="flex items-center gap-2 select-none">
      {/* Connection indicator */}
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${connected ? 'bg-emerald-400' : 'bg-slate-300'}`}
        title={connected ? 'Collaboration active' : 'Déconnecté'}
      />

      {connected && (
        <>
          {/* Other users' avatars */}
          <div className="flex -space-x-2">
            {others.slice(0, 4).map(u => (
              <UserAvatar key={u} name={u} />
            ))}
            {others.length > 4 && (
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 ring-2 ring-white">
                +{others.length - 4}
              </div>
            )}
          </div>

          {/* Label */}
          <span className="text-xs text-slate-500 hidden sm:block">
            {others.length === 0
              ? 'Vous êtes seul(e)'
              : `${others.length} collaborateur${others.length > 1 ? 's' : ''}`}
          </span>
        </>
      )}

      {!connected && (
        <span className="text-xs text-slate-400">Connexion…</span>
      )}
    </div>
  )
}

export { useCollaboration }
export type { CollabEvent }
