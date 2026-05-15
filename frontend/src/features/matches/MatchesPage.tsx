import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, getApiErrorMessage } from '../../lib/api-client'
import { ResponsiveSection } from '../../components/ui/ResponsiveSection'
import { ResponsiveTable } from '../../components/ui/ResponsiveTable'
import { Modal } from '../../components/ui/Modal'
import { FormField } from '../../components/ui/FormField'
import { DateTimeField } from '../../components/ui/DateTimeField'
import { GroupSelector } from '../../components/ui/GroupSelector'
import { PairBadge } from '../../components/ui/PairBadge'
import { PairingStatusBar } from '../../components/ui/PairingStatusBar'
import { useConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Icon } from '../../components/ui/Icon'
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
  createdAt?: string
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

type GuestPlayerItem = {
  id: string
  matchId: string
  createdByUserId: string
  fullName: string
  nickname: string
  shirtNumber?: number
  status: string
  respondedAt: string | null
  createdAt: string
  positions: Array<{ positionCode: string; priority: number; isPrimary: boolean }>
}

type PairingPlayer = {
  userId: string | null
  guestPlayerId: string | null
  fullName: string
  playerHandle?: string | null
  primaryPositionCode: string
  secondaryPositionCode?: string | null
  isPrimary: boolean
}

type PairView = {
  id: string
  positionCode: string
  playerA: PairingPlayer
  playerB: PairingPlayer
}

type PairingPreviewResponse = {
  pairs: PairView[]
  unpaired: PairingPlayer[]
  cupReached: boolean
  totalConfirmed: number
}

type DetailTab = 'roster' | 'pairs' | 'teams' | 'guests'

function toDateTimeLocalValue(value: string): string {
  const date = new Date(value)
  const iso = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString()
  return iso.slice(0, 16)
}

function isMatchClosed(match: MatchItem): boolean {
  if (match.status !== 'SCHEDULED') return true
  if (match.targetPlayers != null && match.confirmedCount >= match.targetPlayers) return true
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

function emptyMatchForm() {
  return {
    title: '',
    description: '',
    startsAt: '',
    configLocation: '',
    configTargetPlayers: DEFAULT_TARGET_PLAYERS,
    configDurationMinutes: DEFAULT_DURATION_MINUTES,
    configTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota',
    targetGroupIds: [] as string[],
  }
}

export function MatchesPage() {
  const queryClient = useQueryClient()
  const addToast = useToastStore((s) => s.addToast)
  const { ConfirmDialogComponent, requestConfirm } = useConfirmDialog()
  const user = useAuthStore((state) => state.user)
  const canManageTeams = user?.roles.some((role) => role === 'DT' || role === 'ADMIN')
  const canManageGuests = user?.roles.some((role) => role === 'DT' || role === 'ADMIN' || role === 'PLAYER')
  const isManager = Boolean(canManageTeams)

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<MatchItem | null>(null)
  const [detailTab, setDetailTab] = useState<DetailTab>('roster')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SCHEDULED' | 'CANCELLED'>('ALL')
  const [guestFullName, setGuestFullName] = useState('')
  const [guestNickname, setGuestNickname] = useState('')
  const [guestShirtNumber, setGuestShirtNumber] = useState<number | undefined>()
  const [guestPositionCodes, setGuestPositionCodes] = useState<string[]>([])
  const [matchForm, setMatchForm] = useState(emptyMatchForm())
  const [manualPairMode, setManualPairMode] = useState(false)
  const [manualPairA, setManualPairA] = useState<string | null>(null)
  const [manualPairB, setManualPairB] = useState<string | null>(null)
  const [manualPairPosition, setManualPairPosition] = useState<string>('')
  const [manualPairPlayerTypeA, setManualPairPlayerTypeA] = useState<'user' | 'guest'>('user')
  const [manualPairPlayerTypeB, setManualPairPlayerTypeB] = useState<'user' | 'guest'>('user')

  const matchesQuery = useQuery({
    queryKey: ['matches'],
    queryFn: async () => (await apiClient.get<MatchItem[]>('/api/v1/matches')).data,
  })

  const guestsQuery = useQuery({
    queryKey: ['match-guests', selectedMatch?.id],
    queryFn: async () => (await apiClient.get<GuestPlayerItem[]>(`/api/v1/matches/${selectedMatch!.id}/guest-players`)).data,
    enabled: Boolean(selectedMatch) && Boolean(canManageGuests),
  })

  const confirmedQuery = useQuery({
    queryKey: ['match-confirmed', selectedMatch?.id],
    queryFn: async () => {
      const res = await apiClient.get<ConfirmedPlayersResponse>(`/api/v1/matches/${selectedMatch!.id}/confirmed`)
      return res.data.players
    },
    enabled: Boolean(selectedMatch),
  })

  const teamsQuery = useQuery({
    queryKey: ['match-teams', selectedMatch?.id],
    queryFn: async () => (await apiClient.get<Team[]>(`/api/v1/matches/${selectedMatch!.id}/teams`)).data,
    enabled: Boolean(selectedMatch),
  })

  const rosterQuery = useQuery({
    queryKey: ['match-roster', selectedMatch?.id],
    queryFn: async () => (await apiClient.get<RosterResponse>(`/api/v1/matches/${selectedMatch!.id}/roster`)).data,
    enabled: Boolean(selectedMatch),
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const configResponse = await apiClient.post<MatchConfigItem>('/api/v1/configs', {
        location: matchForm.configLocation || null,
        targetPlayers: matchForm.configTargetPlayers,
        durationMinutes: matchForm.configDurationMinutes,
        timezone: matchForm.configTimezone,
        description: matchForm.description || null,
      })
      await apiClient.post('/api/v1/matches', {
        configId: configResponse.data.id,
        title: matchForm.title.trim() || null,
        description: matchForm.description || null,
        startsAt: new Date(matchForm.startsAt).toISOString(),
        targetGroupIds: matchForm.targetGroupIds,
      })
    },
    onSuccess: () => {
      addToast('success', 'Partido creado correctamente')
      queryClient.invalidateQueries({ queryKey: ['matches'] })
      setCreateModalOpen(false)
      setMatchForm(emptyMatchForm())
    },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'No se pudo crear el partido')),
  })

  const cancelMutation = useMutation({
    mutationFn: async (matchId: string) => {
      await apiClient.delete(`/api/v1/matches/${matchId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] })
      setDetailModalOpen(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (matchId: string) => {
      await apiClient.delete(`/api/v1/matches/${matchId}/delete`)
    },
    onSuccess: () => {
      addToast('success', 'Convocatoria eliminada')
      queryClient.invalidateQueries({ queryKey: ['matches'] })
      setDetailModalOpen(false)
      setSelectedMatch(null)
    },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'No se pudo eliminar la convocatoria')),
  })

  const exportConfirmedMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const response = await apiClient.get(`/api/v1/matches/${matchId}/confirmed/export`, { responseType: 'blob' })
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
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
      await apiClient.post(`/api/v1/matches/${selectedMatch!.id}/guest-players`, {
        fullName: guestFullName.trim(),
        nickname: guestNickname.trim() || undefined,
        shirtNumber: guestShirtNumber,
        positionCodes: guestPositionCodes.length > 0 ? guestPositionCodes : undefined,
      })
    },
    onSuccess: () => {
      setGuestFullName('')
      setGuestNickname('')
      setGuestShirtNumber(undefined)
      setGuestPositionCodes([])
      addToast('success', 'Invitado agregado')
      queryClient.invalidateQueries({ queryKey: ['match-guests', selectedMatch?.id] })
      queryClient.invalidateQueries({ queryKey: ['match-confirmed', selectedMatch?.id] })
      queryClient.invalidateQueries({ queryKey: ['match-roster', selectedMatch?.id] })
      queryClient.invalidateQueries({ queryKey: ['match-pairing', selectedMatch?.id] })
    },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'No se pudo agregar invitado')),
  })

  const updateGuestStatusMutation = useMutation({
    mutationFn: async ({ guestId, status }: { guestId: string; status: string }) => {
      await apiClient.put(`/api/v1/matches/${selectedMatch!.id}/guest-players/${guestId}/attendance`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match-guests', selectedMatch?.id] })
      queryClient.invalidateQueries({ queryKey: ['match-confirmed', selectedMatch?.id] })
      queryClient.invalidateQueries({ queryKey: ['match-roster', selectedMatch?.id] })
    },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'No se pudo actualizar invitado')),
  })

  const deleteGuestMutation = useMutation({
    mutationFn: async (guestId: string) => {
      await apiClient.delete(`/api/v1/matches/${selectedMatch!.id}/guest-players/${guestId}`)
    },
    onSuccess: () => {
      addToast('success', 'Invitado eliminado')
      queryClient.invalidateQueries({ queryKey: ['match-guests', selectedMatch?.id] })
      queryClient.invalidateQueries({ queryKey: ['match-confirmed', selectedMatch?.id] })
      queryClient.invalidateQueries({ queryKey: ['match-roster', selectedMatch?.id] })
    },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'No se pudo eliminar invitado')),
  })

  const pairingQuery = useQuery({
    queryKey: ['match-pairing', selectedMatch?.id],
    queryFn: async () => (await apiClient.get<PairingPreviewResponse>(`/api/v1/matches/${selectedMatch!.id}/pairs/preview`)).data,
    enabled: Boolean(selectedMatch) && isManager,
  })

  const generatePairsMutation = useMutation({
    mutationFn: async () => (await apiClient.post<PairingPreviewResponse>(`/api/v1/matches/${selectedMatch!.id}/pairs`)).data,
    onSuccess: (data) => {
      addToast('success', `${data.pairs.length} parejas generadas`)
      // Actualizamos el estado inmediatamente para que el usuario vea las parejas sin esperar al refetch.
      queryClient.setQueryData(['match-pairing', selectedMatch?.id], data)
      queryClient.invalidateQueries({ queryKey: ['match-pairing', selectedMatch?.id] })
      queryClient.invalidateQueries({ queryKey: ['match-teams', selectedMatch?.id] })
    },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'No se pudieron generar las parejas')),
  })

  const drawTeamsMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/api/v1/matches/${selectedMatch!.id}/pairs/draw`)
    },
    onSuccess: () => {
      addToast('success', 'Equipos sorteados correctamente')
      queryClient.invalidateQueries({ queryKey: ['match-teams', selectedMatch?.id] })
      queryClient.invalidateQueries({ queryKey: ['match-pairing', selectedMatch?.id] })
    },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'No se pudo completar el sorteo')),
  })

  const resetPairsMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/api/v1/matches/${selectedMatch!.id}/pairs`)
    },
    onSuccess: () => {
      addToast('success', 'Parejas y equipos reiniciados')
      queryClient.invalidateQueries({ queryKey: ['match-pairing', selectedMatch?.id] })
      queryClient.invalidateQueries({ queryKey: ['match-teams', selectedMatch?.id] })
    },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'No se pudieron resetear las parejas')),
  })

  const createManualPairMutation = useMutation({
    mutationFn: async () => {
      const isGuestA = manualPairPlayerTypeA === 'guest'
      const isGuestB = manualPairPlayerTypeB === 'guest'
      await apiClient.post<PairingPreviewResponse>(`/api/v1/matches/${selectedMatch!.id}/pairs/manual`, {
        playerAId: isGuestA ? null : manualPairA,
        playerBId: isGuestB ? null : manualPairB,
        guestPlayerAId: isGuestA ? manualPairA : null,
        guestPlayerBId: isGuestB ? manualPairB : null,
        positionCode: manualPairPosition,
      })
    },
    onSuccess: (data) => {
      addToast('success', 'Pareja creada')
      setManualPairMode(false)
      setManualPairA(null)
      setManualPairB(null)
      setManualPairPosition('')
      queryClient.setQueryData(['match-pairing', selectedMatch?.id], data)
      queryClient.invalidateQueries({ queryKey: ['match-pairing', selectedMatch?.id] })
    },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'No se pudo crear la pareja')),
  })

  const deletePairMutation = useMutation({
    mutationFn: async (pairId: string) => {
      await apiClient.delete(`/api/v1/matches/${selectedMatch!.id}/pairs/${pairId}`)
    },
    onSuccess: () => {
      addToast('success', 'Pareja eliminada')
      queryClient.invalidateQueries({ queryKey: ['match-pairing', selectedMatch?.id] })
    },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'No se pudo eliminar la pareja')),
  })

  const toggleGuestPosition = (code: string) => {
    setGuestPositionCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    )
  }

  const toggleGroup = (groupId: string) => {
    setMatchForm((prev) => ({
      ...prev,
      targetGroupIds: prev.targetGroupIds.includes(groupId)
        ? prev.targetGroupIds.filter((id) => id !== groupId)
        : [...prev.targetGroupIds, groupId],
    }))
  }

  const openDetail = (match: MatchItem) => {
    setSelectedMatch(match)
    setDetailTab('roster')
    setDetailModalOpen(true)
  }

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

  const handleDeleteMatch = async (match: MatchItem) => {
    const confirmed = await requestConfirm({
      title: 'Eliminar convocatoria',
      description: `Seguro que deseas eliminar "${match.title}" permanentemente? Se borraran todos los datos asociados (asistencias, parejas, equipos, invitados). Esta accion no se puede deshacer.`,
      confirmLabel: 'Eliminar convocatoria',
      variant: 'danger',
    })
    if (confirmed) {
      deleteMutation.mutate(match.id)
    }
  }

  const visibleMatches = (matchesQuery.data ?? [])
    .filter((match) => (statusFilter === 'ALL' ? true : match.status === statusFilter))
    .slice()
    .sort((left, right) => {
      const leftTime = new Date(left.createdAt ?? left.startsAt).getTime()
      const rightTime = new Date(right.createdAt ?? right.startsAt).getTime()
      return rightTime - leftTime
    })

  const detailTabs = [
    { label: 'Roster', active: detailTab === 'roster', onClick: () => setDetailTab('roster') },
    ...(canManageTeams ? [{ label: 'Parejas', active: detailTab === 'pairs', onClick: () => setDetailTab('pairs') }] : []),
    ...(canManageTeams ? [{ label: 'Equipos', active: detailTab === 'teams', onClick: () => setDetailTab('teams') }] : []),
    ...(canManageGuests ? [{ label: 'Invitados', active: detailTab === 'guests', onClick: () => setDetailTab('guests') }] : []),
  ]

  return (
    <div className="space-y-6">
      {ConfirmDialogComponent}

      {isManager && (
        <ResponsiveSection
          title="Partidos"
          description="Gestiona convocatorias y partidos manuales"
            action={
            <button className="ui-button" onClick={() => setCreateModalOpen(true)} title="Nuevo partido">
              <Icon name="user-plus" size="sm" />
              <span>Nuevo partido</span>
            </button>
          }
        />
      )}

      <ResponsiveSection
        title={isManager ? 'Convocatorias y partidos' : 'Mis convocatorias'}
        description={isManager ? 'Visualiza y gestiona convocatorias activas' : 'Revisa partidos y abre su detalle'}
        action={
          <select
            className="ui-input min-w-44 sm:min-w-52"
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
          <p className="mt-3 text-sm text-[var(--danger)]">No se pudieron cargar los partidos.</p>
        )}
        {matchesQuery.data && (
          <ResponsiveTable
            data={visibleMatches}
            rowKey={(match) => match.id}
            emptyMessage="No hay partidos creados."
            emptyIcon="matches"
            columns={[
              { key: 'title', label: 'Titulo', render: (match) => (
                <div>
                  <p className="font-medium">{match.title}</p>
                  {isManager && <p className="ui-text-muted text-xs">{match.createdByName ?? '-'}</p>}
                </div>
              )},
              { key: 'info', label: 'Ubicacion / Inicio', render: (match) => (
                <div>
                  <p className="text-sm">{match.location ?? '-'}</p>
                  <p className="ui-text-muted text-xs">{toDateTimeLocalValue(match.startsAt).replace('T', ' ')}</p>
                </div>
              )},
              { key: 'status', label: 'Estado / Origen', render: (match) => {
                const isCancelled = match.status === 'CANCELLED'
                const isClosed = isMatchClosed(match) && match.status === 'SCHEDULED'
                return (
                  <div className="flex items-center gap-1.5">
                    <span className={`ui-badge ${isCancelled ? 'ui-badge-danger' : isClosed ? 'ui-badge-muted' : 'ui-badge-success'}`}>
                      {statusLabel(match)}
                    </span>
                    <span className="ui-text-muted text-xs">{sourceTypeLabel(match.sourceType)}</span>
                  </div>
                )
              }},
              { key: 'roster', label: 'Plantilla / Grupos', render: (match) => (
                <div>
                  <p className="text-sm">{match.confirmedCount} / {match.targetPlayers ?? '-'}</p>
                  <p className="ui-text-muted text-xs">
                    {match.targetGroups && match.targetGroups.length > 0
                      ? match.targetGroups.map((g) => g.name).join(', ')
                      : 'Todos'}
                  </p>
                </div>
              )},
              {
                key: 'actions',
                label: '',
                className: 'text-right',
                render: (match) => (
                  <div className="flex justify-end gap-1">
                    <button className="ui-icon-btn" onClick={() => openDetail(match)} title="Ver detalle">
                      <Icon name="eye" size="sm" />
                    </button>
                    {isManager && (
                      <button className="ui-icon-btn" onClick={() => handleCancelMatch(match)} disabled={match.status === 'CANCELLED' || cancelMutation.isPending} title="Cancelar partido">
                        <Icon name="x" size="sm" />
                      </button>
                    )}
                    {isManager && (
                      <button className="ui-icon-btn ui-icon-btn-danger" onClick={() => handleDeleteMatch(match)} disabled={deleteMutation.isPending} title="Eliminar convocatoria">
                        <Icon name="trash" size="sm" />
                      </button>
                    )}
                    {canManageTeams && (
                      <button className="ui-icon-btn" onClick={() => exportConfirmedMutation.mutate(match.id)} disabled={exportConfirmedMutation.isPending} title="Exportar confirmados">
                        <Icon name="download" size="sm" />
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
            renderMobileCard={(match) => (
              <div className="space-y-2 text-sm">
                <div>
                  <p className="font-semibold">{match.title}</p>
                  {isManager && <p className="ui-text-muted text-xs">{match.createdByName ?? '-'}</p>}
                </div>
                <p className="ui-text-muted">{match.location ?? '-'} · {toDateTimeLocalValue(match.startsAt).replace('T', ' ')}</p>
                <p className="ui-text-muted">
                  {match.confirmedCount} / {match.targetPlayers ?? '-'}{isMatchClosed(match) && match.status === 'SCHEDULED' ? ' (Cerrado)' : ''}
                  {' · '}
                  {match.targetGroups && match.targetGroups.length > 0
                    ? match.targetGroups.map((g) => g.name).join(', ')
                    : 'Todos'}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <span className="ui-text-muted text-xs font-medium uppercase">{statusLabel(match)} | {sourceTypeLabel(match.sourceType)}</span>
                  {isManager && (
                    <button className="ui-icon-btn" onClick={() => handleCancelMatch(match)} disabled={match.status === 'CANCELLED' || cancelMutation.isPending} title="Cancelar partido">
                      <Icon name="x" size="sm" />
                    </button>
                  )}
                  {isManager && (
                    <button className="ui-icon-btn ui-icon-btn-danger" onClick={() => handleDeleteMatch(match)} disabled={deleteMutation.isPending} title="Eliminar convocatoria">
                      <Icon name="trash" size="sm" />
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  <button className="ui-icon-btn" onClick={() => openDetail(match)} title="Ver detalle">
                    <Icon name="eye" size="sm" />
                  </button>
                  {canManageTeams && (
                    <button className="ui-icon-btn" onClick={() => exportConfirmedMutation.mutate(match.id)} title="Exportar confirmados">
                      <Icon name="download" size="sm" />
                    </button>
                  )}
                </div>
              </div>
            )}
          />
        )}
        {(cancelMutation.isError || exportConfirmedMutation.isError || deleteMutation.isError) && (
          <p className="mt-3 text-sm text-[var(--danger)]">
            {getApiErrorMessage(cancelMutation.error ?? exportConfirmedMutation.error ?? deleteMutation.error, 'No se pudo completar la accion.')}
          </p>
        )}
      </ResponsiveSection>

      {/* Create Match Modal */}
      {isManager && (
        <Modal
          open={createModalOpen}
          onClose={() => { setCreateModalOpen(false); setMatchForm(emptyMatchForm()); }}
          size="lg"
          title="Nuevo partido"
          subtitle="Alternativa rapida a una serie"
        >
            <div className="ui-detail-section">
            <p className="ui-detail-section-title">Datos del partido</p>
            <FormField label="Titulo" required>
              <input className="ui-input" placeholder="Ej: Partido sabado" value={matchForm.title} onChange={(e) => setMatchForm({ ...matchForm, title: e.target.value })} required />
            </FormField>
            <FormField label="Fecha y hora" required>
              <DateTimeField type="datetime-local" value={matchForm.startsAt} onChange={(e) => setMatchForm({ ...matchForm, startsAt: e.target.value })} required />
            </FormField>
            <FormField label="Descripcion (opcional)">
              <textarea className="ui-input" placeholder="Notas para los jugadores" value={matchForm.description} onChange={(e) => setMatchForm({ ...matchForm, description: e.target.value })} rows={3} />
            </FormField>
          </div>

          <hr className="ui-section-divider" />

          <div className="ui-detail-section">
            <p className="ui-detail-section-title">Configuracion de plantilla</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Ubicacion" required>
                <input className="ui-input" placeholder="Cancha principal" value={matchForm.configLocation} onChange={(e) => setMatchForm({ ...matchForm, configLocation: e.target.value })} required />
              </FormField>
              <FormField label="Plantilla objetivo" required>
                <input className="ui-input" type="number" min={1} value={matchForm.configTargetPlayers} onChange={(e) => setMatchForm({ ...matchForm, configTargetPlayers: Math.max(1, Math.trunc(Number(e.target.value) || 1)) })} required />
              </FormField>
              <FormField label="Duracion (minutos)" required>
                <input className="ui-input" type="number" min={1} value={matchForm.configDurationMinutes} onChange={(e) => setMatchForm({ ...matchForm, configDurationMinutes: Math.max(1, Math.trunc(Number(e.target.value) || 1)) })} required />
              </FormField>
              <FormField label="Zona horaria" required>
                <select className="ui-input" value={matchForm.configTimezone} onChange={(e) => setMatchForm({ ...matchForm, configTimezone: e.target.value })} required>
                  {timezoneOptions.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
                </select>
              </FormField>
            </div>
            <p className="ui-form-hint mt-2">El partido cierra automaticamente al alcanzar la plantilla objetivo.</p>
          </div>

          <hr className="ui-section-divider" />

          <div className="ui-detail-section">
            <p className="ui-detail-section-title">Grupos objetivo</p>
            <p className="ui-form-hint mb-2">Opcional. Si no seleccionas grupos, la convocatoria se enviara a todos los jugadores activos.</p>
            <GroupSelector selectedGroupIds={matchForm.targetGroupIds} onToggleGroup={toggleGroup} />
          </div>

          {createMutation.isError && (
            <p className="text-sm text-[var(--danger)]">
              {getApiErrorMessage(createMutation.error, 'No se pudo crear el partido.')}
            </p>
          )}

          <Modal.Footer>
            <button className="ui-button-muted" onClick={() => { setCreateModalOpen(false); setMatchForm(emptyMatchForm()); }} title="Cancelar">
              <Icon name="x" size="sm" />
              <span>Cancelar</span>
            </button>
            <button className="ui-button" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !matchForm.title.trim() || !matchForm.startsAt || !matchForm.configLocation} title="Crear partido">
              <Icon name="check" size="sm" />
              <span>{createMutation.isPending ? 'Creando...' : 'Crear partido'}</span>
            </button>
          </Modal.Footer>
        </Modal>
      )}

      {/* Detail Modal */}
      {selectedMatch && (
        <Modal
          open={detailModalOpen}
          onClose={() => { setDetailModalOpen(false); setSelectedMatch(null); }}
          size="xl"
          title={selectedMatch.title}
          subtitle={`${toDateTimeLocalValue(selectedMatch.startsAt).replace('T', ' ')} — ${statusLabel(selectedMatch)}`}
          tabs={detailTabs}
        >
          {/* Roster Tab */}
          {detailTab === 'roster' && (
            <div className="space-y-4">
              {rosterQuery.data ? (
                <>
                  <div className="ui-detail-section">
                    <p className="ui-detail-section-title">Titulares ({rosterQuery.data.roster.length} / {selectedMatch.targetPlayers ?? '-'})</p>
                    {rosterQuery.data.roster.length === 0 && <p className="ui-text-muted text-sm">Aun no hay titulares.</p>}
                      <div className="space-y-1">
                      {rosterQuery.data.roster.map((p, index) => {
                        const key = p.userId ?? p.guestPlayerId ?? `roster-${index}`
                        return (
                          <div key={key} className="flex items-center justify-between rounded-md border bg-[var(--bg-panel)] px-3 py-2">
                            <span>{p.fullName}{p.playerHandle ? ` (${p.playerHandle})` : ''}</span>
                            <span className="ui-text-muted text-xs">
                              {positionLabel(p.primaryPositionCode)}{p.guestPlayerId ? ' — Invitado' : ''}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {rosterQuery.data.waitlist.length > 0 && (
                    <div className="ui-detail-section">
                      <p className="ui-detail-section-title">Lista de espera ({rosterQuery.data.waitlist.length})</p>
                      <div className="space-y-1">
                        {rosterQuery.data.waitlist.map((p, index) => {
                          const key = p.userId ?? p.guestPlayerId ?? `waitlist-${index}`
                          return (
                            <div key={key} className="flex items-center justify-between rounded-md border bg-[var(--bg-panel)] px-3 py-2">
                              <span>{p.fullName}{p.playerHandle ? ` (${p.playerHandle})` : ''}</span>
                              <span className="ui-text-muted text-xs">{positionLabel(p.primaryPositionCode)}{p.guestPlayerId ? ' — Invitado' : ''}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {rosterQuery.data.cancelled.length > 0 && (
                    <div className="ui-detail-section">
                      <p className="ui-detail-section-title">Cancelaron ({rosterQuery.data.cancelled.length})</p>
                      <div className="space-y-1">
                        {rosterQuery.data.cancelled.map((p, index) => {
                          const key = p.userId ?? p.guestPlayerId ?? `cancelled-${index}`
                          return <div key={key} className="rounded-md border bg-[var(--bg-panel)] px-3 py-2 ui-text-muted">{p.fullName}{p.guestPlayerId ? ' — Invitado' : ''}</div>
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : confirmedQuery.data ? (
                <div className="ui-detail-section">
                  <p className="ui-detail-section-title">Confirmados ({confirmedQuery.data.length} / {selectedMatch.targetPlayers ?? '-'})</p>
                  <div className="space-y-1">
                    {confirmedQuery.data.map((player, index) => {
                      const key = player.userId ?? player.guestPlayerId ?? `confirmed-${index}`
                      return <div key={key} className="rounded-md border bg-[var(--bg-panel)] px-3 py-2">{player.fullName}{player.playerHandle ? ` (${player.playerHandle})` : ''}{player.guestPlayerId ? ' — Invitado' : ''}</div>
                    })}
                  </div>
                </div>
              ) : (
                <p className="ui-text-muted text-sm">Cargando...</p>
              )}
            </div>
          )}

          {/* Pairs Tab */}
          {detailTab === 'pairs' && canManageTeams && (
            <div className="space-y-6">
              {selectedMatch.targetPlayers && (
                <PairingStatusBar
                  confirmedCount={pairingQuery.data?.totalConfirmed ?? 0}
                  targetPlayers={selectedMatch.targetPlayers}
                  pairsCount={pairingQuery.data?.pairs.length ?? 0}
                  cupReached={pairingQuery.data?.cupReached ?? false}
                />
              )}

              <div className="rounded-lg border border-[var(--border-soft)] p-4">
                <h4 className="mb-3 text-sm font-semibold">Flujo de emparejamiento</h4>
                <div className="mb-4 flex items-center gap-3">
                  <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ${pairingQuery.data?.pairs.length ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--bg-panel)] text-[var(--text-secondary)]'}`}>
                    <Icon name="users" size="sm" />
                    Generar parejas
                  </div>
                  <span className="text-[var(--text-secondary)]">→</span>
                  <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ${teamsQuery.data && teamsQuery.data.length > 0 ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--bg-panel)] text-[var(--text-secondary)]'}`}>
                    <Icon name="dashboard" size="sm" />
                    Sortear equipos
                  </div>
                  <span className="text-[var(--text-secondary)]">→</span>
                  <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ${teamsQuery.data && teamsQuery.data.length > 0 ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--bg-panel)] text-[var(--text-secondary)]'}`}>
                    <Icon name="configs" size="sm" />
                    Ajustar si es necesario
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="ui-button"
                    onClick={() => generatePairsMutation.mutate()}
                    disabled={generatePairsMutation.isPending}
                    title="Generar parejas"
                  >
                    <Icon name="users" size="sm" />
                    <span>{generatePairsMutation.isPending ? 'Generando...' : 'Generar parejas'}</span>
                  </button>
                  <button
                    className={manualPairMode ? 'ui-button' : 'ui-button-muted'}
                    onClick={() => {
                      setManualPairMode(!manualPairMode)
                      if (!manualPairMode) {
                        setManualPairA(null)
                        setManualPairB(null)
                        setManualPairPosition('')
                      }
                    }}
                    title={manualPairMode ? 'Cancelar' : 'Emparejamiento manual'}
                  >
                    <Icon name="user-plus" size="sm" />
                    <span>{manualPairMode ? 'Cancelar' : 'Emparejamiento manual'}</span>
                  </button>
                  <button
                    className="ui-button"
                    onClick={() => drawTeamsMutation.mutate()}
                    disabled={drawTeamsMutation.isPending || !pairingQuery.data?.pairs.length}
                    title="Sortear equipos"
                  >
                    <Icon name="dashboard" size="sm" />
                    <span>{drawTeamsMutation.isPending ? 'Sorteando...' : 'Sortear equipos'}</span>
                  </button>
                  {(pairingQuery.data?.pairs.length ?? 0) > 0 && (
                    <button
                      className="ui-button-muted"
                      onClick={() => resetPairsMutation.mutate()}
                      disabled={resetPairsMutation.isPending}
                      title="Reiniciar parejas y equipos"
                    >
                      <Icon name="trash" size="sm" />
                      <span>{resetPairsMutation.isPending ? 'Reiniciando...' : 'Reiniciar todo'}</span>
                    </button>
                  )}
                </div>

                {manualPairMode && (
                  <div className="rounded-lg border border-[var(--accent)] bg-[var(--accent)]/5 p-4">
                    <h4 className="mb-3 text-sm font-semibold">Crear pareja manualmente</h4>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                      <div>
                        <label className="ui-form-label">Tipo Jugador A</label>
                        <select className="ui-input" value={manualPairPlayerTypeA} onChange={(e) => { setManualPairPlayerTypeA(e.target.value as 'user' | 'guest'); setManualPairA(null) }}>
                          <option value="user">Jugador</option>
                          <option value="guest">Invitado</option>
                        </select>
                      </div>
                      <div>
                        <label className="ui-form-label">Jugador A</label>
                        <select className="ui-input" value={manualPairA ?? ''} onChange={(e) => setManualPairA(e.target.value || null)}>
                          <option value="">Seleccionar...</option>
                          {manualPairPlayerTypeA === 'user'
                            ? (confirmedQuery.data ?? [])
                                .filter((p) => Boolean(p.userId))
                                .map((p) => (
                                  <option key={p.userId!} value={p.userId!}>
                                    {p.fullName}
                                  </option>
                                ))
                            : (guestsQuery.data ?? [])
                                .filter((g) => g.status === 'YES')
                                .map((g) => (
                                  <option key={g.id} value={g.id}>
                                    {g.fullName}
                                  </option>
                                ))}
                        </select>
                      </div>
                      <div>
                        <label className="ui-form-label">Tipo Jugador B</label>
                        <select className="ui-input" value={manualPairPlayerTypeB} onChange={(e) => { setManualPairPlayerTypeB(e.target.value as 'user' | 'guest'); setManualPairB(null) }}>
                          <option value="user">Jugador</option>
                          <option value="guest">Invitado</option>
                        </select>
                      </div>
                      <div>
                        <label className="ui-form-label">Jugador B</label>
                        <select className="ui-input" value={manualPairB ?? ''} onChange={(e) => setManualPairB(e.target.value || null)}>
                          <option value="">Seleccionar...</option>
                          {manualPairPlayerTypeB === 'user'
                            ? (confirmedQuery.data ?? [])
                                .filter((p) => Boolean(p.userId))
                                .map((p) => (
                                  <option key={p.userId!} value={p.userId!}>
                                    {p.fullName}
                                  </option>
                                ))
                            : (guestsQuery.data ?? [])
                                .filter((g) => g.status === 'YES')
                                .map((g) => (
                                  <option key={g.id} value={g.id}>
                                    {g.fullName}
                                  </option>
                                ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="ui-form-label">Posicion</label>
                        <select className="ui-input" value={manualPairPosition} onChange={(e) => setManualPairPosition(e.target.value)}>
                          <option value="">Seleccionar posicion...</option>
                          {PLAYER_POSITION_OPTIONS.map((pos) => (
                            <option key={pos.value} value={pos.value}>{pos.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="ui-form-label">&nbsp;</label>
                        <button
                          className="ui-button w-full"
                          onClick={() => createManualPairMutation.mutate()}
                          disabled={createManualPairMutation.isPending || !manualPairA || !manualPairB || !manualPairPosition}
                          title="Crear pareja"
                        >
                          <Icon name="check" size="sm" />
                          <span>{createManualPairMutation.isPending ? 'Creando...' : 'Crear pareja'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {(generatePairsMutation.isError || drawTeamsMutation.isError || resetPairsMutation.isError) && (
                <p className="text-sm text-[var(--danger)]">
                  {getApiErrorMessage(generatePairsMutation.error ?? drawTeamsMutation.error ?? resetPairsMutation.error, 'No se pudo completar la operacion.')}
                </p>
              )}

              {pairingQuery.isLoading && <p className="ui-text-muted text-sm">Cargando...</p>}

              {pairingQuery.data && (
                <>
                  {pairingQuery.data.pairs.length > 0 ? (
                    <div>
                      <h4 className="mb-3 text-sm font-semibold">Parejas ({pairingQuery.data.pairs.length})</h4>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {pairingQuery.data.pairs.map((pair, i) => (
                          <PairBadge
                            key={pair.id}
                            playerA={pair.playerA}
                            playerB={pair.playerB}
                            positionCode={pair.positionCode}
                            pairNumber={i + 1}
                            onDelete={() => deletePairMutation.mutate(pair.id)}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-[var(--border-soft)] p-8 text-center">
                      <Icon name="users" size="lg" className="ui-text-muted mb-3 mx-auto" />
                      <p className="ui-text-muted text-sm">Presiona "Generar parejas" para crear los emparejamientos automaticamente.</p>
                    </div>
                  )}

                  {pairingQuery.data.unpaired.length > 0 && (
                    <div className="rounded-lg border border-[var(--warning)] bg-[var(--warning-bg)] p-4">
                      <p className="mb-2 text-sm font-medium">Jugadores sin pareja ({pairingQuery.data.unpaired.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {pairingQuery.data.unpaired.map((p, index) => {
                          const key = p.userId ?? p.guestPlayerId ?? `unpaired-${index}`
                          return (
                            <span key={key} className="inline-flex items-center gap-1 rounded-md border border-[var(--warning)] px-2 py-1 text-xs">
                              <span className="h-1.5 w-1.5 rounded-full bg-[var(--warning)]"></span>
                              {p.fullName}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Teams Tab */}
          {detailTab === 'teams' && canManageTeams && (
            <div className="space-y-6">
              {teamsQuery.data && teamsQuery.data.length > 0 ? (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Equipos sorteados</h4>
                    <button
                      className="ui-button-muted"
                      onClick={() => drawTeamsMutation.mutate()}
                      disabled={drawTeamsMutation.isPending || !pairingQuery.data?.pairs.length}
                      title="Volver a sortear"
                    >
                      <Icon name="configs" size="sm" />
                      <span>{drawTeamsMutation.isPending ? 'Sorteando...' : 'Volver a sortear'}</span>
                    </button>
                  </div>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {teamsQuery.data.map((team) => (
                      <div
                        key={team.teamNumber}
                        className={`rounded-lg border p-4 ${
                          team.teamNumber === 1
                            ? 'border-blue-500/30 bg-blue-50 dark:border-blue-400/25 dark:bg-blue-950/20'
                            : 'border-orange-600/30 bg-orange-50 dark:border-orange-400/25 dark:bg-orange-950/20'
                        }`}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className={`font-semibold ${
                            team.teamNumber === 1
                              ? 'text-blue-700 dark:text-blue-300'
                              : 'text-orange-700 dark:text-orange-300'
                          }`}>{team.name}</h4>
                          <span className="ui-text-muted text-xs">{team.players.length} jugadores</span>
                        </div>
                        <div className="space-y-2">
                          {team.players.map((player, i) => {
                            const key = player.userId ?? player.guestPlayerId ?? `team-${team.teamNumber}-${i}`
                            const handle = player.playerHandle
                              ? player.playerHandle
                              : player.guestPlayerId ? `[Inv.]` : ''
                            return (
                              <div key={key} className="flex items-center justify-between rounded-md bg-[var(--bg-panel)] px-3 py-2 shadow-sm">
                                <div className="flex items-center gap-2">
                                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                                    team.teamNumber === 1
                                      ? 'bg-blue-600 text-white dark:bg-blue-500'
                                      : 'bg-orange-700 text-white dark:bg-orange-600'
                                  }`}>
                                    {i + 1}
                                  </span>
                                  <span className="text-sm font-medium text-[var(--text-primary)]">{player.fullName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {handle && <span className="ui-text-muted text-xs">{handle}</span>}
                                  <span className="rounded border border-[var(--border-soft)] bg-[var(--bg-hover)] px-1.5 py-0.5 text-xs text-[var(--text-secondary)]">{positionLabel(player.primaryPositionCode)}</span>
                                </div>
                              </div>
                            )
                          })}
                          {team.players.length === 0 && (
                            <p className="ui-text-muted py-2 text-center text-sm">Sin jugadores</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-[var(--border-soft)] p-8 text-center">
                  <Icon name="dashboard" size="lg" className="ui-text-muted mb-3 mx-auto" />
                  <p className="text-sm font-medium">Aun no hay equipos sorteados</p>
                  <p className="ui-text-muted mt-1 text-xs">Ve a la pestaña "Parejas" y presiona "Sortear equipos" para generar los equipos automaticamente.</p>
                </div>
              )}
            </div>
          )}

          {/* Guests Tab */}
          {detailTab === 'guests' && canManageGuests && (
            <div className="space-y-4">
              <form className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4" onSubmit={(e) => {
                e.preventDefault()
                if (guestFullName.trim()) createGuestMutation.mutate()
              }}>
                <div className="sm:col-span-1 xl:col-span-1">
                  <label className="ui-form-label">Nombre del invitado</label>
                  <input className="ui-input" placeholder="Nombre completo" value={guestFullName} onChange={(e) => setGuestFullName(e.target.value)} required />
                </div>
                <div className="sm:col-span-1 xl:col-span-1">
                  <label className="ui-form-label">Apodo (opcional)</label>
                  <input className="ui-input" placeholder="Apodo" value={guestNickname} onChange={(e) => setGuestNickname(e.target.value)} />
                </div>
                <div className="sm:col-span-1 xl:col-span-1">
                  <label className="ui-form-label">Camiseta (opcional)</label>
                  <input className="ui-input" type="number" placeholder="Nro" min={1} value={guestShirtNumber || ''} onChange={(e) => setGuestShirtNumber(e.target.value ? Number(e.target.value) : undefined)} />
                </div>
                <div className="sm:col-span-2 xl:col-span-1">
                  <label className="ui-form-label">Posiciones (opcional)</label>
                  <div className="flex flex-wrap gap-1">
                    {PLAYER_POSITION_OPTIONS.map((opt) => (
                      <button key={opt.value} type="button" className={`rounded-md border px-2 py-1 text-xs ${guestPositionCodes.includes(opt.value) ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-contrast)]' : 'border-[var(--border-soft)]'}`} onClick={() => toggleGuestPosition(opt.value)}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button className="ui-button sm:col-span-2 xl:col-span-4" type="submit" disabled={createGuestMutation.isPending || !guestFullName.trim()} title="Agregar invitado">
                  <Icon name="user-plus" size="sm" />
                  <span>{createGuestMutation.isPending ? 'Agregando...' : 'Agregar'}</span>
                </button>
              </form>

              {createGuestMutation.isError && (
                <p className="text-sm text-[var(--danger)]">{getApiErrorMessage(createGuestMutation.error, 'No se pudo agregar invitado.')}</p>
              )}

              {guestsQuery.isLoading && <p className="ui-text-muted text-sm">Cargando invitados...</p>}

              {guestsQuery.data && guestsQuery.data.length > 0 && (
                <div className="space-y-2">
                  {guestsQuery.data.map((guest) => (
                    <div key={guest.id} className="ui-muted-surface flex items-center justify-between rounded-lg px-3 py-2">
                      <div>
                        <p className="font-medium">{guest.fullName}</p>
                        {guest.nickname && <p className="ui-text-muted text-xs">Apodo: {guest.nickname}{guest.shirtNumber ? `#${guest.shirtNumber}` : ''}</p>}
                        <p className="ui-text-muted text-xs">
                          {guest.positions.length > 0 ? guest.positions.filter(p => p.isPrimary).map(p => positionLabel(p.positionCode)).join(', ') || guest.positions[0] ? positionLabel(guest.positions[0].positionCode) : 'Sin posicion' : 'Sin posicion'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {guest.status === 'PENDING' && (
                          <>
                            <button className="ui-icon-btn" onClick={() => updateGuestStatusMutation.mutate({ guestId: guest.id, status: 'YES' })} disabled={updateGuestStatusMutation.isPending} title="Confirmar">
                              <Icon name="check" size="sm" />
                            </button>
                            <button className="ui-icon-btn ui-icon-btn-danger" onClick={() => updateGuestStatusMutation.mutate({ guestId: guest.id, status: 'NO' })} disabled={updateGuestStatusMutation.isPending} title="Declinar">
                              <Icon name="x" size="sm" />
                            </button>
                          </>
                        )}
                        {guest.status === 'YES' && (
                          <button className="ui-icon-btn ui-icon-btn-danger" onClick={() => updateGuestStatusMutation.mutate({ guestId: guest.id, status: 'CANCELLED' })} disabled={updateGuestStatusMutation.isPending} title="Cancelar">
                            <Icon name="x" size="sm" />
                          </button>
                        )}
                        {guest.status === 'CANCELLED' && (
                          <button className="ui-icon-btn" onClick={() => updateGuestStatusMutation.mutate({ guestId: guest.id, status: 'YES' })} disabled={updateGuestStatusMutation.isPending} title="Reactivar">
                            <Icon name="check" size="sm" />
                          </button>
                        )}
                        {guest.status === 'NO' && (
                          <button className="ui-icon-btn" onClick={() => updateGuestStatusMutation.mutate({ guestId: guest.id, status: 'PENDING' })} disabled={updateGuestStatusMutation.isPending} title="Pendiente">
                            <Icon name="clock" size="sm" />
                          </button>
                        )}
                        <span className={`ui-badge ${guest.status === 'YES' ? 'ui-badge-success' : guest.status === 'NO' ? 'ui-badge-danger' : 'ui-badge-muted'}`}>
                          {guest.status === 'YES' ? 'Confirmado' : guest.status === 'NO' ? 'No asistira' : guest.status === 'CANCELLED' ? 'Cancelado' : 'Pendiente'}
                        </span>
                        <button className="ui-icon-btn ui-icon-btn-danger" onClick={() => deleteGuestMutation.mutate(guest.id)} disabled={deleteGuestMutation.isPending} title="Eliminar invitado">
                          <Icon name="trash" size="sm" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {guestsQuery.data && guestsQuery.data.length === 0 && (
                <div className="rounded-lg border border-dashed border-[var(--border-soft)] p-6 text-center">
                  <Icon name="user-plus" size="lg" className="ui-text-muted mb-2 mx-auto" />
                  <p className="ui-text-muted text-sm">No hay invitados agregados a este partido.</p>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
