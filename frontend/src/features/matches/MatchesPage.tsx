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

  const matchesQuery = useQuery({
    queryKey: ['matches'],
    queryFn: async () => (await apiClient.get<MatchItem[]>('/api/v1/matches')).data,
  })

  const guestsQuery = useQuery({
    queryKey: ['match-guests', selectedMatch?.id],
    queryFn: async () => (await apiClient.get<GuestPlayerItem[]>(`/api/v1/matches/${selectedMatch!.id}/guest-players`)).data,
    enabled: Boolean(selectedMatch) && isManager,
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

  const visibleMatches = (matchesQuery.data ?? []).filter((match) =>
    statusFilter === 'ALL' ? true : match.status === statusFilter,
  )

  const detailTabs = [
    { label: 'Roster', active: detailTab === 'roster', onClick: () => setDetailTab('roster') },
    ...(canManageTeams ? [{ label: 'Parejas', active: detailTab === 'pairs', onClick: () => setDetailTab('pairs') }] : []),
    ...(canManageTeams ? [{ label: 'Equipos', active: detailTab === 'teams', onClick: () => setDetailTab('teams') }] : []),
    ...(isManager ? [{ label: 'Invitados', active: detailTab === 'guests', onClick: () => setDetailTab('guests') }] : []),
  ]

  return (
    <div className="space-y-6">
      {ConfirmDialogComponent}

      {isManager && (
        <ResponsiveSection
          title="Partidos"
          description="Gestiona convocatorias y partidos manuales"
          action={
            <button className="ui-button" onClick={() => setCreateModalOpen(true)}>
              Nuevo partido
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
            columns={[
              { key: 'title', label: 'Titulo', render: (match) => match.title },
              { key: 'location', label: 'Ubicacion', render: (match) => match.location ?? '-' },
              { key: 'start', label: 'Inicio', render: (match) => toDateTimeLocalValue(match.startsAt).replace('T', ' ') },
              { key: 'status', label: 'Estado', render: (match) => statusLabel(match) },
              ...(isManager ? [{ key: 'owner', label: 'Creado por', render: (match: MatchItem) => match.createdByName ?? '-' }] : []),
              { key: 'roster', label: 'Plantilla', render: (match) => `${match.confirmedCount} / ${match.targetPlayers ?? '-'}` },
              { key: 'source', label: 'Origen', render: (match) => sourceTypeLabel(match.sourceType) },
              { key: 'groups', label: 'Grupos', render: (match) =>
                match.targetGroups && match.targetGroups.length > 0
                  ? match.targetGroups.map((group) => group.name).join(', ')
                  : 'Todos'
              },
              {
                key: 'actions',
                label: '',
                className: 'text-right',
                render: (match) => (
                  <div className="flex justify-end gap-2">
                    <button className="ui-button-muted" onClick={() => openDetail(match)}>Ver detalle</button>
                    {isManager && (
                      <button className="ui-button-muted" onClick={() => handleCancelMatch(match)} disabled={match.status === 'CANCELLED' || cancelMutation.isPending}>
                        {cancelMutation.isPending ? 'Cancelando...' : 'Cancelar'}
                      </button>
                    )}
                    {canManageTeams && (
                      <button className="ui-button-muted" onClick={() => exportConfirmedMutation.mutate(match.id)} disabled={exportConfirmedMutation.isPending}>
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
                <p className="ui-text-muted">Plantilla: {match.confirmedCount} / {match.targetPlayers ?? '-'}{isMatchClosed(match) && match.status === 'SCHEDULED' ? ' (Cerrado)' : ''}</p>
                <p className="ui-text-muted">Origen: {sourceTypeLabel(match.sourceType)}</p>
                <p className="ui-text-muted">Grupos: {match.targetGroupIds && match.targetGroupIds.length > 0 ? match.targetGroupIds.length : 'Todos'}</p>
                {match.targetGroups && match.targetGroups.length > 0 && (
                  <p className="ui-text-muted text-xs">({match.targetGroups.map((group) => group.name).join(', ')})</p>
                )}
                <div className="flex items-center justify-between gap-2">
                  <span className="ui-text-muted text-xs font-medium uppercase">{statusLabel(match)} | {sourceTypeLabel(match.sourceType)}</span>
                  {isManager && (
                    <button className="ui-button-muted" onClick={() => handleCancelMatch(match)} disabled={match.status === 'CANCELLED' || cancelMutation.isPending}>
                      {cancelMutation.isPending ? 'Cancelando...' : 'Cancelar'}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="ui-button-muted" onClick={() => openDetail(match)}>Ver detalle</button>
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
            {getApiErrorMessage(cancelMutation.error ?? exportConfirmedMutation.error, 'No se pudo completar la accion.')}
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
            <button className="ui-button-muted" onClick={() => { setCreateModalOpen(false); setMatchForm(emptyMatchForm()); }}>
              Cancelar
            </button>
            <button className="ui-button" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !matchForm.title.trim() || !matchForm.startsAt || !matchForm.configLocation}>
              {createMutation.isPending ? 'Creando...' : 'Crear partido'}
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
                          <div key={key} className="flex items-center justify-between rounded-md border px-3 py-2">
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
                            <div key={key} className="flex items-center justify-between rounded-md border px-3 py-2">
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
                          return <div key={key} className="rounded-md border px-3 py-2 ui-text-muted">{p.fullName}{p.guestPlayerId ? ' — Invitado' : ''}</div>
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
                      return <div key={key} className="rounded-md border px-3 py-2">{player.fullName}{player.playerHandle ? ` (${player.playerHandle})` : ''}{player.guestPlayerId ? ' — Invitado' : ''}</div>
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
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--success)] text-[10px] text-white">1</span>
                    Generar parejas
                  </div>
                  <span className="text-[var(--text-secondary)]">→</span>
                  <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ${pairingQuery.data?.pairs.length ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--bg-panel)] text-[var(--text-secondary)]'}`}>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--success)] text-[10px] text-white">2</span>
                    Sortear equipos
                  </div>
                  <span className="text-[var(--text-secondary)]">→</span>
                  <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ${teamsQuery.data && teamsQuery.data.length > 0 ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--bg-panel)] text-[var(--text-secondary)]'}`}>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--success)] text-[10px] text-white">3</span>
                    Ajustar si es necesario
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="ui-button"
                    onClick={() => generatePairsMutation.mutate()}
                    disabled={generatePairsMutation.isPending}
                  >
                    {generatePairsMutation.isPending ? 'Generando...' : 'Generar parejas'}
                  </button>
                  <button
                    className="ui-button-primary"
                    onClick={() => drawTeamsMutation.mutate()}
                    disabled={drawTeamsMutation.isPending || !pairingQuery.data?.pairs.length}
                  >
                    {drawTeamsMutation.isPending ? 'Sorteando...' : 'Sortear equipos'}
                  </button>
                  {(pairingQuery.data?.pairs.length ?? 0) > 0 && (
                    <button
                      className="ui-button-muted"
                      onClick={() => resetPairsMutation.mutate()}
                      disabled={resetPairsMutation.isPending}
                    >
                      {resetPairsMutation.isPending ? 'Reiniciando...' : 'Reiniciar todo'}
                    </button>
                  )}
                </div>
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
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-[var(--border-soft)] p-8 text-center">
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
                      className="ui-button-muted text-xs"
                      onClick={() => drawTeamsMutation.mutate()}
                      disabled={drawTeamsMutation.isPending || !pairingQuery.data?.pairs.length}
                    >
                      {drawTeamsMutation.isPending ? 'Sorteando...' : 'Volver a sortear'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {teamsQuery.data.map((team) => (
                      <div
                        key={team.teamNumber}
                        className={`rounded-lg border p-4 ${
                          team.teamNumber === 1
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/20'
                            : 'border-orange-700 bg-orange-50 dark:bg-orange-950/20'
                        }`}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="font-semibold">{team.name}</h4>
                          <span className="ui-text-muted text-xs">{team.players.length} jugadores</span>
                        </div>
                        <div className="space-y-2">
                          {team.players.map((player, i) => {
                            const key = player.userId ?? player.guestPlayerId ?? `team-${team.teamNumber}-${i}`
                            const handle = player.playerHandle
                              ? player.playerHandle
                              : player.guestPlayerId ? `[Inv.]` : ''
                            return (
                              <div key={key} className="flex items-center justify-between rounded-md bg-white px-3 py-2 shadow-sm">
                                <div className="flex items-center gap-2">
                                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                                    team.teamNumber === 1
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-orange-700 text-white'
                                  }`}>
                                    {i + 1}
                                  </span>
                                  <span className="text-sm font-medium">{player.fullName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {handle && <span className="ui-text-muted text-xs">{handle}</span>}
                                  <span className="rounded border px-1.5 py-0.5 text-xs">{positionLabel(player.primaryPositionCode)}</span>
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
                  <p className="text-sm font-medium">Aun no hay equipos sorteados</p>
                  <p className="ui-text-muted mt-1 text-xs">Ve a la pestaña "Parejas" y presiona "Sortear equipos" para generar los equipos automaticamente.</p>
                </div>
              )}
            </div>
          )}

          {/* Guests Tab */}
          {detailTab === 'guests' && isManager && (
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
                <button className="ui-button sm:col-span-2 xl:col-span-4" type="submit" disabled={createGuestMutation.isPending || !guestFullName.trim()}>
                  {createGuestMutation.isPending ? 'Agregando...' : 'Agregar'}
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
                      <div className="flex items-center gap-2">
                        {guest.status === 'PENDING' && (
                          <>
                            <button className="ui-button text-xs" onClick={() => updateGuestStatusMutation.mutate({ guestId: guest.id, status: 'YES' })} disabled={updateGuestStatusMutation.isPending}>Confirmar</button>
                            <button className="ui-button-muted text-xs" onClick={() => updateGuestStatusMutation.mutate({ guestId: guest.id, status: 'NO' })} disabled={updateGuestStatusMutation.isPending}>Declinar</button>
                          </>
                        )}
                        {guest.status === 'YES' && (
                          <button className="ui-button-muted text-xs" onClick={() => updateGuestStatusMutation.mutate({ guestId: guest.id, status: 'CANCELLED' })} disabled={updateGuestStatusMutation.isPending}>Cancelar</button>
                        )}
                        {guest.status === 'CANCELLED' && (
                          <button className="ui-button-muted text-xs" onClick={() => updateGuestStatusMutation.mutate({ guestId: guest.id, status: 'YES' })} disabled={updateGuestStatusMutation.isPending}>Reactivar</button>
                        )}
                        {guest.status === 'NO' && (
                          <button className="ui-button-muted text-xs" onClick={() => updateGuestStatusMutation.mutate({ guestId: guest.id, status: 'PENDING' })} disabled={updateGuestStatusMutation.isPending}>Pendiente</button>
                        )}
                        <span className={`ui-badge ${guest.status === 'YES' ? 'ui-badge-success' : guest.status === 'NO' ? 'ui-badge-danger' : 'ui-badge-muted'}`}>
                          {guest.status === 'YES' ? 'Confirmado' : guest.status === 'NO' ? 'No asistira' : guest.status === 'CANCELLED' ? 'Cancelado' : 'Pendiente'}
                        </span>
                        <button className="text-xs text-[var(--danger)] hover:underline" onClick={() => deleteGuestMutation.mutate(guest.id)} disabled={deleteGuestMutation.isPending}>Eliminar</button>
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
        </Modal>
      )}
    </div>
  )
}
