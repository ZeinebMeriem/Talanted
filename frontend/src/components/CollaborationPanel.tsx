import React, { useEffect, useState, useRef, useCallback } from 'react'
import { CollabEvent, ProjectLock } from '../hooks/useCollaboration'
import { getCollaborators, addCollaborator, removeCollaborator, searchUsers, CollaboratorInfo } from '../api'

interface CollaborationPanelProps {
  projectId: string
  userName: string
  connected: boolean
  activeUsers: string[]
  projectLock?: ProjectLock | null
  isOwner?: boolean
  accessToken?: string
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
  connected,
  activeUsers,
  projectLock,
  isOwner = false,
  accessToken,
}) => {

  const [showModal, setShowModal] = useState(false)
  const [collaborators, setCollaborators] = useState<CollaboratorInfo[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<CollaboratorInfo[]>([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>()

  const loadCollaborators = useCallback(async () => {
    if (!projectId) return
    try {
      const list = await getCollaborators(projectId, accessToken)
      setCollaborators(list)
    } catch { /* ignore */ }
  }, [projectId, accessToken])

  useEffect(() => {
    if (showModal) loadCollaborators()
  }, [showModal, loadCollaborators])

  useEffect(() => {
    clearTimeout(searchTimeout.current)
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    searchTimeout.current = setTimeout(async () => {
      try {
        const results = await searchUsers(searchQuery, accessToken)
        setSearchResults(results.filter(r => r.userId !== collaborators.find(c => c.userId === r.userId)?.userId))
      } catch { /* ignore */ } finally {
        setSearching(false)
      }
    }, 400)
  }, [searchQuery, accessToken, collaborators])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setShowModal(false)
      }
    }
    if (showModal) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showModal])

  const handleAdd = async (user: CollaboratorInfo) => {
    setAdding(user.userId)
    try {
      await addCollaborator(projectId, user.userId, accessToken)
      setCollaborators(prev => [...prev, user])
      setSearchQuery('')
      setSearchResults([])
    } catch { /* ignore */ } finally {
      setAdding(null)
    }
  }

  const handleRemove = async (userId: string) => {
    setRemoving(userId)
    try {
      await removeCollaborator(projectId, userId, accessToken)
      setCollaborators(prev => prev.filter(c => c.userId !== userId))
    } catch { /* ignore */ } finally {
      setRemoving(null)
    }
  }

  const others = activeUsers.filter((u: string) => u !== userName)

  return (
    <div className="relative flex items-center gap-2 select-none">
      {/* Connection indicator */}
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${connected ? 'bg-emerald-400' : 'bg-slate-300'}`}
        title={connected ? 'Collaboration active' : 'Déconnecté'}
      />

      {connected && (
        <>
          <div className="flex -space-x-2">
            {others.slice(0, 4).map((u: string) => (
              <UserAvatar key={u} name={u} />
            ))}
            {others.length > 4 && (
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 ring-2 ring-white">
                +{others.length - 4}
              </div>
            )}
          </div>

          <span className="text-xs text-slate-500 hidden sm:block">
            {projectLock
              ? `${projectLock.lockedBy === userName ? 'Vous éditez...' : `${projectLock.lockedBy} édite...`}`
              : others.length === 0
                ? 'Vous êtes seul(e)'
                : `${others.length} collaborateur${others.length > 1 ? 's' : ''}`}
          </span>
          {projectLock && projectLock.lockedBy !== userName && (
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#f59e0b', flexShrink: 0, display: 'inline-block',
            }} title={`${projectLock.lockedBy} est en train d'éditer`} />
          )}
        </>
      )}

      {!connected && (
        <span className="text-xs text-slate-400">Connexion…</span>
      )}

      {/* Invite button — owner only */}
      {isOwner && (
        <button
          onClick={() => setShowModal(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '3px 10px', borderRadius: 6, border: '1px solid #e2e8f0',
            background: showModal ? '#f1f5f9' : '#fff', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, color: '#475569',
          }}
          title="Gérer les collaborateurs"
        >
          <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 17v-1a4 4 0 00-4-4H8a4 4 0 00-4 4v1" strokeLinecap="round"/>
            <circle cx="10" cy="7" r="3"/>
            <path d="M16 11v6m3-3h-6" strokeLinecap="round"/>
          </svg>
          Inviter
        </button>
      )}

      {/* Modal */}
      {showModal && (
        <div
          ref={modalRef}
          style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 8, zIndex: 1000,
            width: 320, background: '#fff', borderRadius: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0',
            padding: 16,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Collaborateurs</span>
            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 18, lineHeight: 1 }}>×</button>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '7px 10px', borderRadius: 6,
              border: '1px solid #e2e8f0', fontSize: 13, outline: 'none',
              marginBottom: 8, boxSizing: 'border-box',
            }}
            autoFocus
          />

          {/* Search results */}
          {(searching || searchResults.length > 0) && (
            <div style={{ marginBottom: 12, borderRadius: 6, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
              {searching && (
                <div style={{ padding: '8px 12px', fontSize: 12, color: '#94a3b8' }}>Recherche...</div>
              )}
              {!searching && searchResults.map(user => (
                <div key={user.userId} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderBottom: '1px solid #f8fafc',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: '#019cda', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700,
                    }}>
                      {user.username[0]?.toUpperCase() || '?'}
                    </div>
                    <span style={{ fontSize: 13, color: '#0f172a' }}>{user.username}</span>
                  </div>
                  <button
                    onClick={() => handleAdd(user)}
                    disabled={adding === user.userId}
                    style={{
                      padding: '3px 10px', borderRadius: 5, border: 'none',
                      background: '#019cda', color: '#fff', fontSize: 12,
                      fontWeight: 600, cursor: 'pointer', opacity: adding === user.userId ? 0.6 : 1,
                    }}
                  >
                    {adding === user.userId ? '...' : 'Ajouter'}
                  </button>
                </div>
              ))}
              {!searching && searchResults.length === 0 && searchQuery.length >= 2 && (
                <div style={{ padding: '8px 12px', fontSize: 12, color: '#94a3b8' }}>Aucun résultat</div>
              )}
            </div>
          )}

          {/* Current collaborators */}
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>
            Accès partagé ({collaborators.length})
          </div>
          {collaborators.length === 0 ? (
            <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '12px 0' }}>
              Aucun collaborateur pour l'instant
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {collaborators.map(c => (
                <div key={c.userId} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 8px', borderRadius: 6, background: '#f8fafc',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%',
                      background: '#15395e', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700,
                    }}>
                      {c.username[0]?.toUpperCase() || '?'}
                    </div>
                    <span style={{ fontSize: 13, color: '#0f172a' }}>{c.username}</span>
                  </div>
                  <button
                    onClick={() => handleRemove(c.userId)}
                    disabled={removing === c.userId}
                    style={{
                      padding: '2px 8px', borderRadius: 5, border: '1px solid #fca5a5',
                      background: '#fff', color: '#ef4444', fontSize: 11,
                      cursor: 'pointer', opacity: removing === c.userId ? 0.6 : 1,
                    }}
                  >
                    {removing === c.userId ? '...' : 'Retirer'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export type { CollabEvent }
