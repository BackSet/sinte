import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../lib/api-client'
import { Icon } from './Icon'

type UserItem = {
  id: string
  fullName: string
  email: string
  nickname?: string
  nicknameTag?: string
  playerHandle?: string
  active: boolean
  roles: string[]
}

type PlayerSelectorProps = {
  existingMemberIds: string[]
  onAddPlayer: (playerHandle: string) => void
  isAdding: boolean
}

export function PlayerSelector({ existingMemberIds, onAddPlayer, isAdding }: PlayerSelectorProps) {
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const usersQuery = useQuery({
    queryKey: ['users-for-group-selector'],
    queryFn: async () => {
      const response = await apiClient.get<UserItem[]>('/api/v1/users?page=0&size=200')
      return response.data
    },
  })

  const activeUsers = useMemo(
    () => (usersQuery.data ?? []).filter((u) => u.active),
    [usersQuery.data],
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return activeUsers
    return activeUsers.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.playerHandle ?? '').toLowerCase().includes(q) ||
        (u.nickname ?? '').toLowerCase().includes(q),
    )
  }, [activeUsers, search])

  const toggleSelect = (userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const handleAddSelected = () => {
    const selected = activeUsers.filter((u) => selectedIds.has(u.id))
    for (const user of selected) {
      if (user.playerHandle) {
        onAddPlayer(user.playerHandle)
      }
    }
    setSelectedIds(new Set())
  }

  const totalSelectable = filtered.filter((u) => u.playerHandle && !existingMemberIds.includes(u.id)).length

  return (
    <div className="space-y-3">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
          <Icon name="search" size="sm" />
        </span>
        <input
          className="ui-input pl-10"
          placeholder="Buscar por nombre, correo o codigo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {usersQuery.isLoading && (
        <p className="ui-text-muted py-6 text-center text-sm">Cargando jugadores...</p>
      )}
      {usersQuery.isError && (
        <p className="py-6 text-center text-sm text-red-600">No se pudieron cargar los jugadores.</p>
      )}

      {usersQuery.data && (
        <>
          <div className="flex items-center justify-between">
            <p className="ui-text-muted text-xs">
              {selectedIds.size > 0
                ? `${selectedIds.size} seleccionado(s) de ${totalSelectable} disponibles`
                : `${totalSelectable} jugadores disponibles`}
            </p>
            {selectedIds.size > 0 && (
              <button
                className="ui-button"
                onClick={handleAddSelected}
                disabled={isAdding}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="user-plus" size="sm" />
                  {isAdding ? 'Agregando...' : `Agregar ${selectedIds.size}`}
                </span>
              </button>
            )}
          </div>

          <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-[var(--border-soft)]">
            {filtered.length === 0 && (
              <p className="ui-text-muted py-6 text-center text-sm">
                {search ? 'No se encontraron jugadores con esa busqueda.' : 'No hay jugadores disponibles.'}
              </p>
            )}
            {filtered.map((user) => {
              const isMember = existingMemberIds.includes(user.id)
              const isSelected = selectedIds.has(user.id)
              const canSelect = Boolean(user.playerHandle) && !isMember

              return (
                <label
                  key={user.id}
                  className={`flex items-center gap-3 border-b border-[var(--border-soft)] px-3 py-2.5 text-sm transition-colors last:border-b-0 ${
                    isMember
                      ? 'bg-[var(--bg-muted)] opacity-60'
                      : isSelected
                        ? 'bg-[var(--bg-hover)]'
                        : 'cursor-pointer hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isMember || isSelected}
                    disabled={isMember || !canSelect}
                    onChange={() => canSelect && toggleSelect(user.id)}
                    className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{user.fullName}</span>
                      {user.playerHandle && (
                        <span className="ui-badge">{user.playerHandle}</span>
                      )}
                      {isMember && (
                        <span className="ui-badge ui-badge-muted">Ya esta</span>
                      )}
                    </div>
                    <p className="ui-text-muted truncate text-xs">{user.email}</p>
                  </div>
                </label>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}