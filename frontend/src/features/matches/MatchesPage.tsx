import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, getApiErrorMessage } from '../../lib/api-client'
import { ResponsiveSection } from '../../components/ui/ResponsiveSection'
import { ResponsiveTable } from '../../components/ui/ResponsiveTable'
import { DateTimeField } from '../../components/ui/DateTimeField'
import { GroupSelector } from '../../components/ui/GroupSelector'
import { useConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToastStore } from '../../store/toast-store'
import { useAuthStore } from '../../store/auth-store'
import { PLAYER_POSITION_OPTIONS } from '../../lib/player-positions'

const POSITION_LABELS: Record<string, string> = Object.fromEntries(
  PLAYER_POSITION_OPTIONS.map((opt) => [opt.value, opt.label]),
)

function positionLabel(code: string | undefined | null): string {
  if (!code || code === 'SIN_POSICION') return 'Sin posicion'
  return POSITION_LABELS[code] ?? code
}

type MatchItem = {
  id: string
  createdByName?: string
  title: string
  location?: string
  startsAt: string
  endsAt?: string | null
  status: string
  sourceType: 'MANUAL' | 'SERIES'
  configId: string
  seriesId?: string
  targetGroupIds?: string[]
  targetGroups?: Array<{ id: string; name: string }>
  confirmedCount: number
  pendingCount: number
  targetPlayers?: number
}

type MatchConfigItem = {
  id: string
  location?: string
  targetPlayers: number
  durationMinutes: number
  timezone: string
  description?: string
}

const DEFAULT_TARGET_PLAYERS = 14
const DEFAULT_DURATION_MINUTES = 90

const timezoneOptions = [
  'America/Bogota',
  'America/Mexico_City',
  'America/Lima',
  'America/Santiago',
  'America/Buenos_Aires',
  'America/Montevideo',
  'America/Caracas',
  'America/Panama',
  'America/Guayaquil',
  'America/La_Paz',
  'America/Asuncion',
  'America/Sao_Paulo',
  'America/New_York',
  'Europe/Madrid',
]

type ConfirmedPlayer = {
  userId: string | null
  guestPlayerId: string | null
  fullName: string
  email: string | null
  playerHandle?: string
}

type ConfirmedPlayersResponse = {
  players: ConfirmedPlayer[]
}

type RosterPlayer = {
  userId: string | null
  guestPlayerId: string | null
  fullName: string
  email: string | null
  playerHandle?: string | null
  primaryPositionCode: string
  respondedAt?: string
}

type RosterResponse = {
  roster: RosterPlayer[]
  waitlist: RosterPlayer[]
  cancelled: RosterPlayer[]
}

type TeamPlayer = {
  userId: string | null
  guestPlayerId: string | null
  fullName: string
  playerHandle?: string | null
  primaryPositionCode: string
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
  guestPlayerIds: string[]
}

type GuestPlayerItem = {
  id: string
  matchId: string
  createdByUserId: string
  fullName: string
  status: string
  respondedAt: string | null
  createdAt: string
  positions: Array<{ positionCode: string; priority: number }>
}

function toDateTimeLocalValue(value: string): string {
  const date = new Date(value)
  const iso = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString()
  return iso.slice(0, 16)
}

function isMatchClosed(match: MatchItem): boolean {
  if (match.status !== 'SCHEDULED') {
    return true
  }
  if (match.targetPlayers != null && match.confirmedCount >= match.targetPlayers) {
    return true
  }
  return false
}

function statusLabel(match: MatchItem): string {
  if (match.status === 'FINISHED') return 'Finalizado'
  if (match.status === 'CANCELLED') return 'Cancelado'
  if (isMatchClosed(match)) return 'Cerrado'
  return 'Programado'
}

function sourceTypeLabel(sourceType: string): string {
  if (sourceType === 'SERIES') return 'Serie'
  return 'Manual'
}

export function MatchesPage() {
  const queryClient = useQueryClient()
  const addToast = useToastStore((s) => s.addToast)
  const { ConfirmDialogComponent, requestConfirm } = useConfirmDialog()
  const user = useAuthStore((state) => state.user)
  const canManageTeams = user?.roles.some((role) => role === 'DT' || role === 'ADMIN')
  const isManager = Boolean(canManageTeams)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [configLocation, setConfigLocation] = useState('')
  const [configTargetPlayers, setConfigTargetPlayers] = useState(DEFAULT_TARGET_PLAYERS)
  const [configDurationMinutes, setConfigDurationMinutes] = useState(DEFAULT_DURATION_MINUTES)
  const [configTimezone, setConfigTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota')
  const [targetGroupIds, setTargetGroupIds] = useState<string[]>([])
  const [selectedMatchId, setSelectedMatchId] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SCHEDULED' | 'CANCELLED'>('ALL')
  const [teamSize, setTeamSize] = useState(2)
  const [draftTeams, setDraftTeams] = useState<TeamDraft[]>([])
  const [guestFullName, setGuestFullName] = useState('')
  const [guestPositionCodes, setGuestPositionCodes] = useState<string[]>([])

  const matchesQuery = useQuery({
    queryKey: ['matches'],
    queryFn: async () => (await apiClient.get<MatchItem[]>('/api/v1/matches')).data,
  })

  const guestsQuery = useQuery({
    queryKey: ['match-guests', selectedMatchId],
    queryFn: async () => (await apiClient.get<GuestPlayerItem[]>(`/api/v1/matches/${selectedMatchId}/guest-players`)).data,
    enabled: Boolean(selectedMatchId) && isManager,
  })

  const confirmedQuery = useQuery({
    queryKey: ['match-confirmed', selectedMatchId],
    queryFn: async () => {
      const res = await apiClient.get<ConfirmedPlayersResponse>(`/api/v1/matches/${selectedMatchId}/confirmed`)
      return res.data.players
    },
    enabled: Boolean(selectedMatchId),
  })

  const teamsQuery = useQuery({
    queryKey: ['match-teams', selectedMatchId],
    queryFn: async () => (await apiClient.get<Team[]>(`/api/v1/matches/${selectedMatchId}/teams`)).data,
    enabled: Boolean(selectedMatchId),
  })

  const rosterQuery = useQuery({
    queryKey: ['match-roster', selectedMatchId],
    queryFn: async () =>
      (await apiClient.get<RosterResponse>(`/api/v1/matches/${selectedMatchId}/roster`)).data,
    enabled: Boolean(selectedMatchId),
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const configResponse = await apiClient.post<MatchConfigItem>('/api/v1/configs', {
        location: configLocation || null,
        targetPlayers: configTargetPlayers,
        durationMinutes: configDurationMinutes,
        timezone: configTimezone,
        description: description || null,
      })
      const configId = configResponse.data.id
      await apiClient.post('/api/v1/matches', {
        configId,
        title: title.trim() || null,
        description: description || null,
        startsAt: new Date(startsAt).toISOString(),
        targetGroupIds,
      })
    },
    onSuccess: () => {
      setTitle('')
      setDescription('')
      setStartsAt('')
      setConfigLocation('')
      setConfigTargetPlayers(DEFAULT_TARGET_PLAYERS)
      setConfigDurationMinutes(DEFAULT_DURATION_MINUTES)
      setConfigTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota')
      setTargetGroupIds([])
      addToast('success', 'Partido creado correctamente')
      queryClient.invalidateQueries({ queryKey: ['matches'] })
    },
    onError: (error) => {
      addToast('error', getApiErrorMessage(error, 'No se pudo crear el partido'))
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
          playerIds: team.players.filter((p) => p.userId).map((p) => p.userId!),
          guestPlayerIds: team.players.filter((p) => p.guestPlayerId).map((p) => p.guestPlayerId!),
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
          guestPlayerIds: team.guestPlayerIds,
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

  const createGuestMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/api/v1/matches/${selectedMatchId}/guest-players`, {
        fullName: guestFullName.trim(),
        positionCodes: guestPositionCodes.length > 0 ? guestPositionCodes : undefined,
      })
    },
    onSuccess: () => {
      setGuestFullName('')
      setGuestPositionCodes([])
      addToast('success', 'Invitado agregado')
      queryClient.invalidateQueries({ queryKey: ['match-guests', selectedMatchId] })
      queryClient.invalidateQueries({ queryKey: ['match-confirmed', selectedMatchId] })
      queryClient.invalidateQueries({ queryKey: ['match-roster', selectedMatchId] })
    },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'No se pudo agregar invitado')),
  })

  const updateGuestStatusMutation = useMutation({
    mutationFn: async ({ guestId, status }: { guestId: string; status: string }) => {
      await apiClient.put(`/api/v1/matches/${selectedMatchId}/guest-players/${guestId}/attendance`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match-guests', selectedMatchId] })
      queryClient.invalidateQueries({ queryKey: ['match-confirmed', selectedMatchId] })
      queryClient.invalidateQueries({ queryKey: ['match-roster', selectedMatchId] })
    },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'No se pudo actualizar invitado')),
  })

  const deleteGuestMutation = useMutation({
    mutationFn: async (guestId: string) => {
      await apiClient.delete(`/api/v1/matches/${selectedMatchId}/guest-players/${guestId}`)
    },
    onSuccess: () => {
      addToast('success', 'Invitado eliminado')
      queryClient.invalidateQueries({ queryKey: ['match-guests', selectedMatchId] })
      queryClient.invalidateQueries({ queryKey: ['match-confirmed', selectedMatchId] })
      queryClient.invalidateQueries({ queryKey: ['match-roster', selectedMatchId] })
    },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'No se pudo eliminar invitado')),
  })

  const toggleGuestPosition = (code: string) => {
    setGuestPositionCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    )
  }

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
        playerIds: team.players.filter((p) => p.userId).map((p) => p.userId!),
        guestPlayerIds: team.players.filter((p) => p.guestPlayerId).map((p) => p.guestPlayerId!),
      })),
    )
  }, [teamsQuery.data])

  const handleCancelMatch = async (match: MatchItem) => {
    const confirmed = await requestConfirm({
      title: 'Cancelar partido',
      description: `Seguro que deseas cancelar "${match.title}"? Esta accion no se puede deshacer.`,
      confirmLabel: 'Cancelar partido',
      variant: 'danger',
    })
    if (confirmed) {
      cancelMutation.mutate(match.id)
    }
  }

  const toggleDraftPlayer = (teamNumber: number, playerId: string, isGuest: boolean) => {
    setDraftTeams((current) =>
      current.map((team) => {
        if (team.teamNumber !== teamNumber) {
          return {
            ...team,
            playerIds: isGuest ? team.playerIds : team.playerIds.filter((id) => id !== playerId),
            guestPlayerIds: isGuest ? team.guestPlayerIds.filter((id) => id !== playerId) : team.guestPlayerIds,
          }
        }
        if (isGuest) {
          const exists = team.guestPlayerIds.includes(playerId)
          return {
            ...team,
            guestPlayerIds: exists ? team.guestPlayerIds.filter((id) => id !== playerId) : [...team.guestPlayerIds, playerId],
          }
        } else {
          const exists = team.playerIds.includes(playerId)
          return {
            ...team,
            playerIds: exists ? team.playerIds.filter((id) => id !== playerId) : [...team.playerIds, playerId],
          }
        }
      }),
    )
  }

  const selectedMatch = matchesQuery.data?.find((match) => match.id === selectedMatchId)
  const visibleMatches = (matchesQuery.data ?? []).filter((match) =>
    statusFilter === 'ALL' ? true : match.status === statusFilter,
  )
  const assignedPlayerIds = new Set(draftTeams.flatMap((team) => team.playerIds))
  const assignedGuestIds = new Set(draftTeams.flatMap((team) => team.guestPlayerIds))
  const unassignedPlayers = (confirmedQuery.data ?? []).filter(
    (p) => p.userId && !assignedPlayerIds.has(p.userId) && !assignedGuestIds.has(p.guestPlayerId ?? ''),
  )

  return (
    <div className="space-y-6">
      {ConfirmDialogComponent}

      {isManager && (
        <ResponsiveSection
          title="Crear partido manual"
          description="Alternativa rapida a una serie. El partido cierra automaticamente al llenar la plantilla."
        >
          <form className="mt-4 space-y-5" onSubmit={onSubmit}>
            <div className="ui-section-card space-y-3">
              <div className="ui-section-header">
                <h3>Datos del partido</h3>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="ui-text-muted mb-1 block text-xs">Titulo</label>
                  <input
                    className="ui-input"
                    placeholder="Ej: Partido sabado"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="ui-text-muted mb-1 block text-xs">Fecha y hora del encuentro</label>
                  <DateTimeField
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="ui-text-muted mb-1 block text-xs">Descripcion (opcional)</label>
                  <textarea
                    className="ui-input"
                    placeholder="Notas para los jugadores"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="ui-section-card space-y-3">
              <div className="ui-section-header">
                <h3>Configuracion de plantilla</h3>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="ui-text-muted mb-1 block text-xs">Ubicacion</label>
                  <input
                    className="ui-input"
                    placeholder="Cancha principal"
                    value={configLocation}
                    onChange={(e) => setConfigLocation(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="ui-text-muted mb-1 block text-xs">Plantilla objetivo</label>
                  <input
                    className="ui-input"
                    type="number"
                    min={1}
                    value={configTargetPlayers}
                    onChange={(e) =>
                      setConfigTargetPlayers(Math.max(1, Math.trunc(Number(e.target.value) || 1)))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="ui-text-muted mb-1 block text-xs">Duracion (minutos)</label>
                  <input
                    className="ui-input"
                    type="number"
                    min={1}
                    value={configDurationMinutes}
                    onChange={(e) =>
                      setConfigDurationMinutes(Math.max(1, Math.trunc(Number(e.target.value) || 1)))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="ui-text-muted mb-1 block text-xs">Zona horaria</label>
                  <select className="ui-input" value={configTimezone} onChange={(e) => setConfigTimezone(e.target.value)} required>
                    {timezoneOptions.map((zone) => (
                      <option key={zone} value={zone}>
                        {zone}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="ui-text-muted text-xs">
                El partido cierra automaticamente al alcanzar la plantilla objetivo. Al llegar la fecha del encuentro se cierra y no se puede modificar.
              </p>
            </div>

            <div className="ui-section-card space-y-3">
              <div className="ui-section-header">
                <h3>Grupos objetivo</h3>
                <p>Opcional</p>
              </div>
              <GroupSelector
                selectedGroupIds={targetGroupIds}
                onToggleGroup={toggleGroup}
              />
              <p className="ui-text-muted text-xs">
                Si no seleccionas grupos, la convocatoria se enviara a todos los jugadores activos.
              </p>
            </div>

            <button className="ui-button" type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creando...' : 'Crear partido'}
            </button>
            {createMutation.isError && (
              <p className="text-sm text-[var(--danger)]">
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
          <p className="mt-3 text-sm text-[var(--danger)]">No se pudieron cargar los partidos. Intenta nuevamente.</p>
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
              {
                key: 'status',
                label: 'Estado',
                render: (match) => statusLabel(match),
              },
              ...(isManager
                ? [{ key: 'owner', label: 'Creado por', render: (match: MatchItem) => match.createdByName ?? '-' }]
                : []),
              {
                key: 'roster',
                label: 'Plantilla',
                render: (match) =>
                  `${match.confirmedCount} / ${match.targetPlayers ?? '-'}`,
              },
              { key: 'source', label: 'Origen', render: (match) => sourceTypeLabel(match.sourceType) },
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
                        onClick={() => handleCancelMatch(match)}
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
                <p className="ui-text-muted">
                  Plantilla: {match.confirmedCount} / {match.targetPlayers ?? '-'}
                  {isMatchClosed(match) && match.status === 'SCHEDULED' ? ' (Cerrado)' : ''}
                </p>
                <p className="ui-text-muted">
                  Origen: {sourceTypeLabel(match.sourceType)}
                </p>
                <p className="ui-text-muted">
                  Grupos objetivo: {match.targetGroupIds && match.targetGroupIds.length > 0 ? match.targetGroupIds.length : 'Todos'}
                </p>
                {match.targetGroups && match.targetGroups.length > 0 && (
                  <p className="ui-text-muted text-xs">({match.targetGroups.map((group) => group.name).join(', ')})</p>
                )}
                <div className="flex items-center justify-between gap-2">
                  <span className="ui-text-muted text-xs font-medium uppercase">
                    {statusLabel(match)} | {sourceTypeLabel(match.sourceType)}
                  </span>
                  {isManager && (
                    <button
                      className="ui-button-muted"
                      onClick={() => handleCancelMatch(match)}
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
          <p className="mt-3 text-sm text-[var(--danger)]">
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
          <div className="space-y-5">
            {rosterQuery.data && (
              <>
                <div className="ui-section-card">
                  <div className="ui-section-header">
                    <h3>Plantilla titular</h3>
                    <p>{rosterQuery.data.roster.length} / {selectedMatch?.targetPlayers ?? '-'}</p>
                  </div>
                  <div className="space-y-1 text-sm">
                    {rosterQuery.data.roster.map((p) => {
                      const key = p.userId ?? p.guestPlayerId ?? Math.random().toString()
                      return (
                        <p key={key} className="ui-text-muted">
                          {p.fullName}{p.playerHandle ? ` (${p.playerHandle})` : ''} — {positionLabel(p.primaryPositionCode)}
                          {p.guestPlayerId ? ' [Invitado]' : ''}
                        </p>
                      )
                    })}
                    {rosterQuery.data.roster.length === 0 && <p className="ui-text-muted">Aun no hay titulares.</p>}
                  </div>
                </div>

                {rosterQuery.data.waitlist.length > 0 && (
                  <div className="ui-section-card">
                    <div className="ui-section-header">
                      <h3>Lista de espera</h3>
                      <p>{rosterQuery.data.waitlist.length}</p>
                    </div>
                    <div className="space-y-1 text-sm">
                      {rosterQuery.data.waitlist.map((p) => {
                        const key = p.userId ?? p.guestPlayerId ?? Math.random().toString()
                        return (
                          <p key={key} className="ui-text-muted">
                            {p.fullName}{p.playerHandle ? ` (${p.playerHandle})` : ''} — {positionLabel(p.primaryPositionCode)}
                            {p.guestPlayerId ? ' [Invitado]' : ''}
                          </p>
                        )
                      })}
                    </div>
                  </div>
                )}

                {rosterQuery.data.cancelled.length > 0 && (
                  <div className="ui-section-card">
                    <div className="ui-section-header">
                      <h3>Cancelaron</h3>
                      <p>{rosterQuery.data.cancelled.length}</p>
                    </div>
                    <div className="space-y-1 text-sm">
                      {rosterQuery.data.cancelled.map((p) => {
                        const key = p.userId ?? p.guestPlayerId ?? Math.random().toString()
                        return <p key={key} className="ui-text-muted">{p.fullName}{p.guestPlayerId ? ' [Invitado]' : ''}</p>
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
            {!rosterQuery.data && confirmedQuery.data && (
              <div className="ui-section-card">
                <div className="ui-section-header">
                  <h3>Jugadores confirmados</h3>
                  <p>{confirmedQuery.data.length} / {selectedMatch?.targetPlayers ?? '-'}</p>
                </div>
                <div className="space-y-1 text-sm">
                  {confirmedQuery.data.map((player) => {
                    const key = player.userId ?? player.guestPlayerId ?? Math.random().toString()
                    return (
                      <p key={key} className="ui-text-muted">
                        {player.fullName}{player.playerHandle ? ` (${player.playerHandle})` : ''}{player.guestPlayerId ? ' [Invitado]' : ''}
                      </p>
                    )
                  })}
                  {confirmedQuery.isLoading && <p className="ui-text-muted">Cargando confirmados...</p>}
                  {confirmedQuery.isError && <p className="text-sm text-[var(--danger)]">No se pudieron cargar confirmados.</p>}
                </div>
              </div>
            )}

            {canManageTeams && (
              <div className="ui-section-card space-y-3">
                <div className="ui-section-header">
                  <h3>Armado de equipos</h3>
                </div>
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
                  <p className="text-sm text-[var(--danger)]">
                    {getApiErrorMessage(
                      suggestTeamsMutation.error ?? saveTeamsMutation.error,
                      'No se pudo completar la operacion de equipos.',
                    )}
                  </p>
                )}

                <div className="space-y-3">
                  <div className="ui-muted-surface rounded-lg p-3">
                    <p className="text-sm font-medium">Sin asignar ({unassignedPlayers.length})</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {unassignedPlayers.map((player) => {
                        const key = player.userId ?? player.guestPlayerId ?? Math.random().toString()
                        return (
                          <span key={key} className="rounded-md border px-2 py-1 text-xs">
                            {player.fullName}{player.guestPlayerId ? ' (Inv.)' : ''}
                          </span>
                        )
                      })}
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
                        {(confirmedQuery.data ?? []).map((player) => {
                          const key = player.userId ?? player.guestPlayerId ?? Math.random().toString()
                          const isGuest = Boolean(player.guestPlayerId)
                          const playerId = isGuest ? player.guestPlayerId : player.userId
                          const isInTeam = isGuest
                            ? team.guestPlayerIds.includes(playerId!)
                            : team.playerIds.includes(playerId!)
                          return (
                            <label key={key} className="inline-flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={isInTeam}
                                onChange={() => toggleDraftPlayer(team.teamNumber, playerId!, isGuest)}
                              />
                              <span>
                                {player.fullName}{player.playerHandle ? ` (${player.playerHandle})` : ''}{isGuest ? ' [Inv.]' : ''}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isManager && selectedMatchId && (
              <div className="ui-section-card space-y-3">
                <div className="ui-section-header">
                  <h3>Invitados</h3>
                  <p>{guestsQuery.data?.length ?? 0}</p>
                </div>
                <form
                  className="flex flex-wrap items-end gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (guestFullName.trim()) createGuestMutation.mutate()
                  }}
                >
                  <div className="min-w-48 flex-1">
                    <label className="ui-text-muted mb-1 block text-xs">Nombre del invitado</label>
                    <input
                      className="ui-input"
                      placeholder="Nombre completo"
                      value={guestFullName}
                      onChange={(e) => setGuestFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex-1">
                    <label className="ui-text-muted mb-1 block text-xs">Posiciones (opcional)</label>
                    <div className="flex flex-wrap gap-1">
                      {PLAYER_POSITION_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className={`rounded-md border px-2 py-1 text-xs ${
                            guestPositionCodes.includes(opt.value)
                              ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                              : 'border-[var(--border)]'
                          }`}
                          onClick={() => toggleGuestPosition(opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button className="ui-button" type="submit" disabled={createGuestMutation.isPending || !guestFullName.trim()}>
                    {createGuestMutation.isPending ? 'Agregando...' : 'Agregar'}
                  </button>
                </form>
                {createGuestMutation.isError && (
                  <p className="text-sm text-[var(--danger)]">{getApiErrorMessage(createGuestMutation.error, 'No se pudo agregar invitado.')}</p>
                )}
                {guestsQuery.isLoading && <p className="ui-text-muted text-sm">Cargando invitados...</p>}
                {guestsQuery.data && guestsQuery.data.length > 0 && (
                  <div className="space-y-2 text-sm">
                    {guestsQuery.data.map((guest) => (
                      <div key={guest.id} className="ui-muted-surface flex items-center justify-between rounded-lg px-3 py-2">
                        <div>
                          <p className="font-medium">{guest.fullName}</p>
                          <p className="ui-text-muted text-xs">
                            {guest.positions.length > 0
                              ? guest.positions.map((p) => positionLabel(p.positionCode)).join(', ')
                              : 'Sin posicion'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {guest.status === 'PENDING' && (
                            <>
                              <button
                                className="ui-button text-xs"
                                onClick={() => updateGuestStatusMutation.mutate({ guestId: guest.id, status: 'YES' })}
                                disabled={updateGuestStatusMutation.isPending}
                              >
                                Confirmar
                              </button>
                              <button
                                className="ui-button-muted text-xs"
                                onClick={() => updateGuestStatusMutation.mutate({ guestId: guest.id, status: 'NO' })}
                                disabled={updateGuestStatusMutation.isPending}
                              >
                                Declinar
                              </button>
                            </>
                          )}
                          {guest.status === 'YES' && (
                            <button
                              className="ui-button-muted text-xs"
                              onClick={() => updateGuestStatusMutation.mutate({ guestId: guest.id, status: 'CANCELLED' })}
                              disabled={updateGuestStatusMutation.isPending}
                            >
                              Cancelar
                            </button>
                          )}
                          {guest.status === 'CANCELLED' && (
                            <button
                              className="ui-button-muted text-xs"
                              onClick={() => updateGuestStatusMutation.mutate({ guestId: guest.id, status: 'YES' })}
                              disabled={updateGuestStatusMutation.isPending}
                            >
                              Reactivar
                            </button>
                          )}
                          {guest.status === 'NO' && (
                            <button
                              className="ui-button-muted text-xs"
                              onClick={() => updateGuestStatusMutation.mutate({ guestId: guest.id, status: 'PENDING' })}
                              disabled={updateGuestStatusMutation.isPending}
                            >
                              Pendiente
                            </button>
                          )}
                          <span className={`ui-badge ${
                            guest.status === 'YES' ? 'ui-badge-success' :
                            guest.status === 'NO' ? 'ui-badge-danger' :
                            guest.status === 'CANCELLED' ? 'ui-badge-muted' : 'ui-badge-muted'
                          }`}>
                            {guest.status === 'YES' ? 'Confirmado' :
                             guest.status === 'NO' ? 'No asistira' :
                             guest.status === 'CANCELLED' ? 'Cancelado' : 'Pendiente'}
                          </span>
                          <button
                            className="text-xs text-[var(--danger)] hover:underline"
                            onClick={() => deleteGuestMutation.mutate(guest.id)}
                            disabled={deleteGuestMutation.isPending}
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {guestsQuery.data && guestsQuery.data.length === 0 && (
                  <p className="ui-text-muted text-sm">No hay invitados agregados a este partido.</p>
                )}
              </div>
            )}
          </div>
        </ResponsiveSection>
      )}
    </div>
  )
}