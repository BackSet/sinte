import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../lib/api-client'
import { Icon } from './Icon'

type GroupItem = {
  id: string
  name: string
  active: boolean
}

type GroupSelectorProps = {
  selectedGroupIds: string[]
  onToggleGroup: (groupId: string) => void
}

export function GroupSelector({ selectedGroupIds, onToggleGroup }: GroupSelectorProps) {
  const [search, setSearch] = useState('')

  const groupsQuery = useQuery({
    queryKey: ['groups-for-selector'],
    queryFn: async () => (await apiClient.get<GroupItem[]>('/api/v1/groups')).data,
  })

  const activeGroups = useMemo(
    () => (groupsQuery.data ?? []).filter((g) => g.active),
    [groupsQuery.data],
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return activeGroups
    return activeGroups.filter((g) => g.name.toLowerCase().includes(q))
  }, [activeGroups, search])

  return (
    <div className="space-y-3">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
          <Icon name="search" size="sm" />
        </span>
        <input
          className="ui-input pl-10"
          placeholder="Buscar grupo por nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {groupsQuery.isLoading && (
        <p className="ui-text-muted py-2 text-center text-sm">Cargando grupos...</p>
      )}
      {groupsQuery.isError && (
        <p className="py-2 text-center text-sm text-[var(--danger)]">No se pudieron cargar los grupos.</p>
      )}

      {groupsQuery.data && (
        <>
          <div className="flex items-center justify-between">
            <p className="ui-text-muted text-xs">
              {selectedGroupIds.length > 0
                ? `${selectedGroupIds.length} grupo${selectedGroupIds.length !== 1 ? 's' : ''} seleccionado${selectedGroupIds.length !== 1 ? 's' : ''}`
                : 'Selecciona grupos o deja vacio para todos los jugadores'}
            </p>
          </div>

          <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-[var(--border-soft)]">
            {filtered.length === 0 && (
              <p className="ui-text-muted py-4 text-center text-sm">
                {search ? 'No se encontraron grupos con esa busqueda.' : 'No hay grupos activos.'}
              </p>
            )}
            {filtered.map((group) => {
              const isSelected = selectedGroupIds.includes(group.id)
              return (
                <label
                  key={group.id}
                  className={`flex cursor-pointer items-center gap-3 border-b border-[var(--border-soft)] px-3 py-2.5 text-sm transition-colors last:border-b-0 ${
                    isSelected
                      ? 'bg-[var(--bg-hover)]'
                      : 'hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleGroup(group.id)}
                    className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                  />
                  <span className="font-medium">{group.name}</span>
                  {isSelected && (
                    <span className="ui-badge ui-badge-success ml-auto">Seleccionado</span>
                  )}
                </label>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}