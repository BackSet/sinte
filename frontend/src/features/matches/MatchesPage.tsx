import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, getApiErrorMessage } from '../../lib/api-client'
import { ResponsiveSection } from '../../components/ui/ResponsiveSection'
import { ResponsiveTable } from '../../components/ui/ResponsiveTable'
import { DateTimeField } from '../../components/ui/DateTimeField'
import { useAuthStore } from '../../store/auth-store'

type MatchItem = {
  id: string
  createdByName?: string
  title: string
  location?: string
  startsAt: string
  endsAt?: string | null
  status: string
  sourceType: string
  targetGroupIds?: string[]
  targetGroups?: Array<{ id: string; name: string }>
  confirmedCount: number
  pendingCount: number
  targetPlayers?: number
}

type GroupItem = {
  id: string
  name: string
  active: boolean
}

type ConfirmedPlayer = {
  userId: string
  fullName: string
  email: string
  playerHandle?: string
  primaryPosition?: string
}

type TeamPlayer = {
  userId: string
  fullName: string
  playerHandle?: string
  primaryPosition?: string
}

type Team = {
  teamNumber: number
  name: string
  players: TeamPlayer[]
}

type TeamDraft = {
  teamNumber: number
  name: string
  playerIds: string[]
}

function toDateTimeLocalValue(value: string): string {
  const date = new Date(value)
  const iso = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString()
  return iso.slice(0, 16)
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return 'Sin hora fin'
  }
  return toDateTimeLocalValue(value).replace('T', ' ')
}

export function MatchesPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const canManageTeams = user?.roles.some((role) => role === 'DT' || role === 'ADMIN')
  const isManager = Boolean(canManageTeams)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [targetGroupIds, setTargetGroupIds] = useState<string[]>([])
  const [selectedMatchId, setSelectedMatchId] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SCHEDULED' | 'CANCELLED'>('ALL')
  const [teamSize, setTeamSize] = useState(2)
  const [draftTeams, setDraftTeams] = useState<TeamDraft[]>([])

  const matchesQuery = useQuery({
    queryKey: ['matches'],
    queryFn: async () => (await apiClient.get<MatchItem[]>('/api/v1/matches')).data,
  })

  const groupsQuery = useQuery({
    queryKey: ['groups-for-matches'],
    queryFn: async () => (await apiClient.get<GroupItem[]>('/api/v1/groups')).data,
    enabled: isManager,
  })

  const confirmedQuery = useQuery({
    queryKey: ['match-confirmed', selectedMatchId],
    queryFn: async () =>
      (await apiClient.get<ConfirmedPlayer[]>(`/api/v1/matches/${selectedMatchId}/confirmed`)).data,
    enabled: Boolean(selectedMatchId),
  })

  const teamsQuery = useQuery({
    queryKey: ['match-teams', selectedMatchId],
    queryFn: async () => (await apiClient.get<Team[]>(`/api/v1/matches/${selectedMatchId}/teams`)).data,
    enabled: Boolean(selectedMatchId),
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/api/v1/matches', {
        title,
        description,
        location,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        targetGroupIds,
      })
    },
    onSuccess: () => {
      setTitle('')
      setDescription('')
      setLocation('')
      setStartsAt('')
      setEndsAt('')
      setTargetGroupIds([])
      queryClient.invalidateQueries({ queryKey: ['matches'] })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async (matchId: string) => {
      await apiClient.delete(`/api/v1/matches/${matchId}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['matches'] }),
  })

  const suggestTeamsMutation = useMutation({
    mutationFn: async () =>
      (await apiClient.post<Team[]>(`/api/v1/matches/${selectedMatchId}/teams/suggest?teamSize=${teamSize}`)).data,
    onSuccess: (teams) => {
      setDraftTeams(
        teams.map((team) => ({
          teamNumber: team.teamNumber,
          name: team.name,
          playerIds: team.players.map((player) => player.userId),
        })),
      )
      queryClient.invalidateQueries({ queryKey: ['match-teams', selectedMatchId] })
    },
  })

  const saveTeamsMutation = useMutation({
    mutationFn: async () => {
      await apiClient.put(`/api/v1/matches/${selectedMatchId}/teams`, {
        teams: draftTeams.map((team) => ({
          teamNumber: team.teamNumber,
          name: team.name,
          playerIds: team.playerIds,
        })),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match-teams', selectedMatchId] })
    },
  })

  const exportConfirmedMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const response = await apiClient.get(`/api/v1/matches/${matchId}/confirmed/export`, {
        responseType: 'blob',
      })
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `confirmados-${matchId}.xlsx`
      anchor.click()
      window.URL.revokeObjectURL(url)
    },
  })

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    createMutation.mutate()
  }

  const toggleGroup = (groupId: string) => {
    setTargetGroupIds((current) =>
      current.includes(groupId) ? current.filter((id) => id !== groupId) : [...current, groupId],
    )
  }

  useEffect(() => {
    if (!teamsQuery.data) return
    setDraftTeams(
      teamsQuery.data.map((team) => ({
        teamNumber: team.teamNumber,
        name: team.name,
        playerIds: team.players.map((player) => player.userId),
      })),
    )
  }, [teamsQuery.data])

  const toggleDraftPlayer = (teamNumber: number, playerId: string) => {
    setDraftTeams((current) =>
      current.map((team) => {
        if (team.teamNumber !== teamNumber) {
          return {
            ...team,
            playerIds: team.playerIds.filter((id) => id !== playerId),
          }
        }
        const exists = team.playerIds.includes(playerId)
        return {
          ...team,
          playerIds: exists ? team.playerIds.filter((id) => id !== playerId) : [...team.playerIds, playerId],
        }
      }),
    )
  }

  const selectedMatch = matchesQuery.data?.find((match) => match.id === selectedMatchId)
  const visibleMatches = (matchesQuery.data ?? []).filter((match) =>
    statusFilter === 'ALL' ? true : match.status === statusFilter,
  )
  const assignedPlayerIds = new Set(draftTeams.flatMap((team) => team.playerIds))
  const unassignedPlayers = (confirmedQuery.data ?? []).filter((player) => !assignedPlayerIds.has(player.userId))

  return (
    <div className="space-y-6">
      {isManager && (
        <ResponsiveSection title="Gestion de partidos" description="Programa partidos manuales con horario y lugar">
          <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={onSubmit}>
            <input className="ui-input" placeholder="Titulo" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <input className="ui-input" placeholder="Ubicacion" value={location} onChange={(e) => setLocation(e.target.value)} />
            <textarea className="ui-input md:col-span-2" placeholder="Descripcion" value={description} onChange={(e) => setDescription(e.target.value)} />
            <DateTimeField type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
            <DateTimeField type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required />
            <div className="ui-muted-surface md:col-span-2 rounded-lg p-3">
              <p className="mb-2 text-sm font-medium">Grupos objetivo (opcional)</p>
              <div className="flex flex-wrap gap-2">
                {(groupsQuery.data ?? [])
                  .filter((group) => group.active)
                  .map((group) => (
                    <label key={group.id} className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={targetGroupIds.includes(group.id)}
                        onChange={() => toggleGroup(group.id)}
                      />
                      <span>{group.name}</span>
                    </label>
                  ))}
              </div>
              <p className="ui-text-muted mt-2 text-xs">
                Si no seleccionas grupos, la convocatoria se enviara a todos los jugadores activos.
              </p>
            </div>
            <button className="ui-button md:col-span-2" type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creando...' : 'Crear partido'}
            </button>
            {createMutation.isError && (
              <p className="md:col-span-2 text-sm text-red-600">
                {getApiErrorMessage(createMutation.error, 'No se pudo crear el partido.')}
              </p>
            )}
          </form>
        </ResponsiveSection>
      )}

      <ResponsiveSection
        title={isManager ? 'Convocatorias y partidos' : 'Mis convocatorias'}
        description={isManager ? 'Visualiza y gestiona convocatorias activas' : 'Revisa partidos y abre su detalle'}
        action={
          <select
            className="ui-input min-w-44"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'ALL' | 'SCHEDULED' | 'CANCELLED')}
            aria-label="Filtrar partidos por estado"
          >
            <option value="ALL">Todos los estados</option>
            <option value="SCHEDULED">Programados</option>
            <option value="CANCELLED">Cancelados</option>
          </select>
        }
      >
        {matchesQuery.isLoading && <p className="ui-text-muted mt-3 text-sm">Cargando partidos...</p>}
        {matchesQuery.isError && (
          <p className="mt-3 text-sm text-red-600">No se pudieron cargar los partidos. Intenta nuevamente.</p>
        )}
        {matchesQuery.data && (
          <ResponsiveTable
            data={visibleMatches}
            rowKey={(match) => match.id}
            emptyMessage="No hay partidos creados."
            columns={[
              { key: 'title', label: 'Titulo', render: (match) => match.title },
              { key: 'location', label: 'Ubicacion', render: (match) => match.location ?? '-' },
              { key: 'start', label: 'Inicio', render: (match) => toDateTimeLocalValue(match.startsAt).replace('T', ' ') },
              { key: 'end', label: 'Fin', render: (match) => formatDateTime(match.endsAt) },
              { key: 'status', label: 'Estado', render: (match) => match.status },
              ...(isManager
                ? [{ key: 'owner', label: 'Creado por', render: (match: MatchItem) => match.createdByName ?? '-' }]
                : []),
              {
                key: 'attendance',
                label: 'Confirmacion',
                render: (match) => `${match.confirmedCount} confirmados / ${match.pendingCount} pendientes`,
              },
              { key: 'source', label: 'Origen', render: (match) => match.sourceType },
              {
                key: 'groups',
                label: 'Grupos',
                render: (match) =>
                  match.targetGroups && match.targetGroups.length > 0
                    ? match.targetGroups.map((group) => group.name).join(', ')
                    : 'Todos',
              },
              {
                key: 'actions',
                label: '',
                className: 'text-right',
                render: (match) => (
                  <div className="flex justify-end gap-2">
                    <button className="ui-button-muted" onClick={() => setSelectedMatchId(match.id)}>
                      Ver detalle
                    </button>
                    {isManager && (
                      <button
                        className="ui-button-muted"
                        onClick={() => cancelMutation.mutate(match.id)}
                        disabled={match.status === 'CANCELLED' || cancelMutation.isPending}
                      >
                        {cancelMutation.isPending ? 'Cancelando...' : 'Cancelar'}
                      </button>
                    )}
                    {canManageTeams && (
                      <button
                        className="ui-button-muted"
                        onClick={() => exportConfirmedMutation.mutate(match.id)}
                        disabled={exportConfirmedMutation.isPending}
                      >
                        {exportConfirmedMutation.isPending ? 'Exportando...' : 'Exportar'}
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
            renderMobileCard={(match) => (
              <div className="space-y-2 text-sm">
                <p className="font-semibold">{match.title}</p>
                <p className="ui-text-muted">Ubicacion: {match.location ?? '-'}</p>
                <p className="ui-text-muted">Inicio: {toDateTimeLocalValue(match.startsAt).replace('T', ' ')}</p>
                <p className="ui-text-muted">Fin: {formatDateTime(match.endsAt)}</p>
                <p className="ui-text-muted">Confirmados: {match.confirmedCount} | Pendientes: {match.pendingCount}</p>
                <p className="ui-text-muted">
                  Grupos objetivo: {match.targetGroupIds && match.targetGroupIds.length > 0 ? match.targetGroupIds.length : 'Todos'}
                </p>
                {match.targetGroups && match.targetGroups.length > 0 && (
                  <p className="ui-text-muted text-xs">({match.targetGroups.map((group) => group.name).join(', ')})</p>
                )}
                <div className="flex items-center justify-between gap-2">
                  <span className="ui-text-muted text-xs font-medium uppercase">
                    {match.status} | {match.sourceType}
                  </span>
                  {isManager && (
                    <button
                      className="ui-button-muted"
                      onClick={() => cancelMutation.mutate(match.id)}
                      disabled={match.status === 'CANCELLED' || cancelMutation.isPending}
                    >
                      {cancelMutation.isPending ? 'Cancelando...' : 'Cancelar'}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="ui-button-muted" onClick={() => setSelectedMatchId(match.id)}>
                    Ver detalle
                  </button>
                  {canManageTeams && (
                    <button className="ui-button-muted" onClick={() => exportConfirmedMutation.mutate(match.id)}>
                      {exportConfirmedMutation.isPending ? 'Exportando...' : 'Exportar'}
                    </button>
                  )}
                </div>
              </div>
            )}
          />
        )}
        {(cancelMutation.isError || exportConfirmedMutation.isError) && (
          <p className="mt-3 text-sm text-red-600">
            {getApiErrorMessage(
              cancelMutation.error ?? exportConfirmedMutation.error,
              'No se pudo completar la accion solicitada.',
            )}
          </p>
        )}
      </ResponsiveSection>

      {selectedMatchId && (
        <ResponsiveSection
          title="Detalle de convocatoria"
          description={
            selectedMatch
              ? `${selectedMatch.title} - ${toDateTimeLocalValue(selectedMatch.startsAt).replace('T', ' ')}`
              : 'Partido seleccionado'
          }
        >
          <div className="space-y-3">
            <div className="ui-card p-3">
              <p className="text-sm font-medium">Jugadores confirmados</p>
              <div className="mt-2 space-y-1 text-sm">
                {(confirmedQuery.data ?? []).map((player) => (
                  <p key={player.userId} className="ui-text-muted">
                    {player.fullName} - {player.playerHandle ?? player.email} ({player.primaryPosition ?? 'N/A'})
                  </p>
                ))}
                {confirmedQuery.isLoading && <p className="ui-text-muted">Cargando confirmados...</p>}
                {confirmedQuery.isError && <p className="text-sm text-red-600">No se pudieron cargar confirmados.</p>}
                {confirmedQuery.data && confirmedQuery.data.length === 0 && (
                  <p className="ui-text-muted">Aun no hay confirmados.</p>
                )}
              </div>
            </div>

            {canManageTeams && (
              <div className="ui-card p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-sm">Tamano de equipo:</label>
                  <input
                    className="ui-input w-24"
                    type="number"
                    min={1}
                    value={teamSize}
                    onChange={(event) => setTeamSize(Math.max(1, Number(event.target.value)))}
                  />
                  <button className="ui-button-muted" onClick={() => suggestTeamsMutation.mutate()}>
                    {suggestTeamsMutation.isPending ? 'Sugiriendo...' : 'Sugerir equipos'}
                  </button>
                  <button className="ui-button" onClick={() => saveTeamsMutation.mutate()} disabled={draftTeams.length === 0}>
                    {saveTeamsMutation.isPending ? 'Guardando...' : 'Guardar equipos'}
                  </button>
                </div>
                {(suggestTeamsMutation.isError || saveTeamsMutation.isError) && (
                  <p className="mt-2 text-sm text-red-600">
                    {getApiErrorMessage(
                      suggestTeamsMutation.error ?? saveTeamsMutation.error,
                      'No se pudo completar la operacion de equipos.',
                    )}
                  </p>
                )}

                <div className="mt-3 space-y-3">
                  <div className="ui-muted-surface rounded-lg p-3">
                    <p className="text-sm font-medium">Sin asignar ({unassignedPlayers.length})</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {unassignedPlayers.map((player) => (
                        <span key={player.userId} className="rounded-md border px-2 py-1 text-xs">
                          {player.fullName}
                        </span>
                      ))}
                      {unassignedPlayers.length === 0 && <span className="ui-text-muted text-xs">Todos los jugadores estan asignados.</span>}
                    </div>
                  </div>
                  {draftTeams.map((team) => (
                    <div key={team.teamNumber} className="ui-muted-surface rounded-lg p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <input
                          className="ui-input"
                          value={team.name}
                          onChange={(event) =>
                            setDraftTeams((current) =>
                              current.map((item) =>
                                item.teamNumber === team.teamNumber
                                  ? { ...item, name: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        {(confirmedQuery.data ?? []).map((player) => (
                          <label key={player.userId} className="inline-flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={team.playerIds.includes(player.userId)}
                              onChange={() => toggleDraftPlayer(team.teamNumber, player.userId)}
                            />
                            <span>{player.fullName} ({player.playerHandle ?? player.email})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ResponsiveSection>
      )}
    </div>
  )
}
