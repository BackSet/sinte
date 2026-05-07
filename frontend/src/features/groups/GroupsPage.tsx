import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, getApiErrorMessage } from '../../lib/api-client'
import { ResponsiveSection } from '../../components/ui/ResponsiveSection'
import { ResponsiveTable } from '../../components/ui/ResponsiveTable'
import { PlayerSelector } from '../../components/ui/PlayerSelector'
import { useConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToastStore } from '../../store/toast-store'
import { Icon } from '../../components/ui/Icon'

type GroupItem = {
  id: string
  name: string
  createdByUserId: string
  active: boolean
  createdAt: string
}

type GroupMemberItem = {
  userId: string
  fullName: string
  email: string
  nickname?: string
  nicknameTag?: string
  playerHandle?: string
  addedAt: string
}

export function GroupsPage() {
  const queryClient = useQueryClient()
  const addToast = useToastStore((s) => s.addToast)
  const { ConfirmDialogComponent, requestConfirm } = useConfirmDialog()
  const [name, setName] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [mode, setMode] = useState<'select' | 'manual'>('select')

  const groupsQuery = useQuery({
    queryKey: ['groups'],
    queryFn: async () => (await apiClient.get<GroupItem[]>('/api/v1/groups')).data,
  })

  const activeGroups = useMemo(
    () => (groupsQuery.data ?? []).filter((group) => group.active),
    [groupsQuery.data],
  )

  const selectedGroup = useMemo(
    () => (groupsQuery.data ?? []).find((group) => group.id === selectedGroupId),
    [groupsQuery.data, selectedGroupId],
  )

  const membersQuery = useQuery({
    queryKey: ['group-members', selectedGroupId],
    queryFn: async () =>
      (await apiClient.get<GroupMemberItem[]>(`/api/v1/groups/${selectedGroupId}/members`)).data,
    enabled: Boolean(selectedGroupId),
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/api/v1/groups', { name })
    },
    onSuccess: () => {
      setName('')
      addToast('success', `Grupo "${name}" creado`)
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
    onError: (error) => {
      addToast('error', getApiErrorMessage(error, 'No se pudo crear el grupo'))
    },
  })

  const setActiveMutation = useMutation({
    mutationFn: async ({ groupId, value }: { groupId: string; value: boolean }) => {
      await apiClient.patch(`/api/v1/groups/${groupId}/active?value=${value}`)
    },
    onSuccess: () => {
      addToast('success', 'Estado del grupo actualizado')
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
    onError: (error) => {
      addToast('error', getApiErrorMessage(error, 'No se pudo cambiar el estado del grupo'))
    },
  })

  const addMemberMutation = useMutation({
    mutationFn: async (playerHandle: string) => {
      await apiClient.post(`/api/v1/groups/${selectedGroupId}/members`, { playerHandle })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', selectedGroupId] })
    },
    onError: (error) => {
      addToast('error', getApiErrorMessage(error, 'No se pudo agregar el jugador'))
    },
  })

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiClient.delete(`/api/v1/groups/${selectedGroupId}/members/${userId}`)
    },
    onSuccess: () => {
      addToast('success', 'Jugador removido del grupo')
      queryClient.invalidateQueries({ queryKey: ['group-members', selectedGroupId] })
    },
    onError: (error) => {
      addToast('error', getApiErrorMessage(error, 'No se pudo remover el jugador'))
    },
  })

  const onCreateGroup = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    createMutation.mutate()
  }

  const handleToggleActive = async (group: GroupItem) => {
    const confirmed = await requestConfirm({
      title: group.active ? 'Desactivar grupo' : 'Activar grupo',
      description: group.active
        ? `Seguro que queres desactivar el grupo "${group.name}"? Los jugadores no podran ser convocados a traves de este grupo.`
        : `Seguro que queres reactivar el grupo "${group.name}"?`,
      confirmLabel: group.active ? 'Desactivar' : 'Activar',
      variant: group.active ? 'danger' : 'default',
    })
    if (confirmed) {
      setActiveMutation.mutate({ groupId: group.id, value: !group.active })
    }
  }

  const handleRemoveMember = async (member: GroupMemberItem) => {
    const confirmed = await requestConfirm({
      title: 'Remover jugador',
      description: `Seguro que queres sacar a ${member.fullName} del grupo "${selectedGroup?.name}"?`,
      confirmLabel: 'Remover',
      variant: 'danger',
    })
    if (confirmed) {
      removeMemberMutation.mutate(member.userId)
    }
  }

  const existingMemberIds = useMemo(
    () => (membersQuery.data ?? []).map((m) => m.userId),
    [membersQuery.data],
  )

  const handleAddPlayer = (playerHandle: string) => {
    addMemberMutation.mutate(playerHandle)
  }

  return (
    <div className="space-y-6">
      {ConfirmDialogComponent}

      <ResponsiveSection title="Crear grupo" description="Organiza jugadores por grupos para convocatorias y avisos">
        <form className="mt-4 flex flex-col gap-3 md:flex-row" onSubmit={onCreateGroup}>
          <input
            className="ui-input"
            placeholder="Nombre del grupo"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <button className="ui-button shrink-0" type="submit" disabled={createMutation.isPending}>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="groups" size="sm" />
              {createMutation.isPending ? 'Creando...' : 'Crear grupo'}
            </span>
          </button>
        </form>
      </ResponsiveSection>

      <ResponsiveSection
        title="Grupos"
        description={`Total: ${(groupsQuery.data ?? []).length} grupos | Activos: ${activeGroups.length}`}
      >
        {groupsQuery.isLoading && <p className="ui-text-muted mt-3 text-sm">Cargando grupos...</p>}
        {groupsQuery.isError && <p className="mt-3 text-sm text-[var(--danger)]">No se pudieron cargar los grupos.</p>}
        {groupsQuery.data && (
          <ResponsiveTable
            data={groupsQuery.data}
            rowKey={(group) => group.id}
            emptyMessage="No hay grupos registrados."
            columns={[
              { key: 'name', label: 'Nombre', render: (group) => group.name },
              { key: 'status', label: 'Estado', render: (group) => (
                <span className={`ui-badge ${group.active ? 'ui-badge-success' : 'ui-badge-muted'}`}>
                  {group.active ? 'Activo' : 'Inactivo'}
                </span>
              )},
              {
                key: 'select',
                label: '',
                className: 'text-right',
                render: (group) => (
                  <div className="flex justify-end gap-2">
                    <button
                      className="ui-button-muted"
                      onClick={() => setSelectedGroupId(group.id)}
                    >
                      Ver miembros
                    </button>
                    <button
                      className={group.active ? 'ui-button-muted' : 'ui-button'}
                      onClick={() => handleToggleActive(group)}
                    >
                      {group.active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                ),
              },
            ]}
            renderMobileCard={(group) => (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{group.name}</p>
                  <span className={`ui-badge ${group.active ? 'ui-badge-success' : 'ui-badge-muted'}`}>
                    {group.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="ui-button-muted" onClick={() => setSelectedGroupId(group.id)}>
                    Ver miembros
                  </button>
                  <button
                    className={group.active ? 'ui-button-muted' : 'ui-button'}
                    onClick={() => handleToggleActive(group)}
                  >
                    {group.active ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            )}
          />
        )}
      </ResponsiveSection>

      <ResponsiveSection
        title="Miembros del grupo"
        description={selectedGroup ? `Grupo seleccionado: ${selectedGroup.name}` : 'Selecciona un grupo'}
        action={
          selectedGroup ? (
            <select
              className="ui-input min-w-48"
              value={selectedGroupId}
              onChange={(event) => setSelectedGroupId(event.target.value)}
            >
              <option value="">Selecciona grupo</option>
              {activeGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          ) : undefined
        }
      >
        {selectedGroupId && (
          <div className="mt-4 space-y-4">
            <div className="ui-muted-surface rounded-lg p-3">
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                  <Icon name="user-plus" size="sm" />
                  Agregar jugadores
                </span>
                <div className="flex gap-1">
                  <button
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${mode === 'select' ? 'bg-[var(--accent)] text-[var(--accent-contrast)]' : 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'}`}
                    onClick={() => setMode('select')}
                  >
                    Seleccionar
                  </button>
                  <button
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${mode === 'manual' ? 'bg-[var(--accent)] text-[var(--accent-contrast)]' : 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'}`}
                    onClick={() => setMode('manual')}
                  >
                    Codigo manual
                  </button>
                </div>
              </div>

              {mode === 'select' ? (
                <PlayerSelector
                  existingMemberIds={existingMemberIds}
                  onAddPlayer={handleAddPlayer}
                  isAdding={addMemberMutation.isPending}
                />
              ) : (
                <ManualMemberForm
                  onSubmit={(handle) => addMemberMutation.mutate(handle)}
                  isPending={addMemberMutation.isPending}
                />
              )}
            </div>

            {addMemberMutation.isSuccess && (
              <div className="rounded-lg border border-[var(--success)]/20 bg-[var(--success)]/5 px-3 py-2 text-sm text-[var(--success)]">
                Jugador agregado al grupo correctamente.
              </div>
            )}

            {membersQuery.isLoading && (
              <p className="ui-text-muted text-sm">Cargando miembros...</p>
            )}
            {membersQuery.isError && (
              <p className="text-sm text-[var(--danger)]">No se pudieron cargar los miembros de este grupo.</p>
            )}

            {membersQuery.data && (
              <div>
                <p className="mb-2 text-sm font-medium">
                  Miembros ({membersQuery.data.length})
                </p>
                <ResponsiveTable
                  data={membersQuery.data}
                  rowKey={(member) => member.userId}
                  emptyMessage="El grupo no tiene jugadores."
                  columns={[
                    { key: 'name', label: 'Nombre', render: (member) => member.fullName },
                    { key: 'email', label: 'Correo', render: (member) => member.email },
                    { key: 'handle', label: 'Codigo', render: (member) => (
                      <span className="ui-badge">{member.playerHandle ?? '-'}</span>
                    )},
                    {
                      key: 'actions',
                      label: '',
                      className: 'text-right',
                      render: (member) => (
                        <button
                          className="ui-button-muted ui-button-danger-text"
                          onClick={() => handleRemoveMember(member)}
                          disabled={removeMemberMutation.isPending}
                        >
                          {removeMemberMutation.isPending ? 'Quitando...' : 'Quitar'}
                        </button>
                      ),
                    },
                  ]}
                  renderMobileCard={(member) => (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">{member.fullName}</p>
                        <span className="ui-badge">{member.playerHandle ?? '-'}</span>
                      </div>
                      <p className="ui-text-muted">{member.email}</p>
                      <button
                        className="ui-button-muted"
                        onClick={() => handleRemoveMember(member)}
                        disabled={removeMemberMutation.isPending}
                      >
                        {removeMemberMutation.isPending ? 'Quitando...' : 'Quitar del grupo'}
                      </button>
                    </div>
                  )}
                />
              </div>
            )}
          </div>
        )}

        {!selectedGroupId && (
          <div className="mt-4 flex flex-col items-center justify-center py-8 text-center">
            <Icon name="groups" size="lg" className="ui-text-muted mb-3" />
            <p className="text-sm font-medium">Selecciona un grupo</p>
            <p className="ui-text-muted mt-1 text-xs">Elige un grupo activo para ver y gestionar sus miembros</p>
          </div>
        )}
      </ResponsiveSection>
    </div>
  )
}

function ManualMemberForm({ onSubmit, isPending }: { onSubmit: (handle: string) => void; isPending: boolean }) {
  const [playerHandle, setPlayerHandle] = useState('')
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!playerHandle.trim()) return
    onSubmit(playerHandle.trim())
    setPlayerHandle('')
  }
  return (
    <form className="flex flex-col gap-3 md:flex-row" onSubmit={handleSubmit}>
      <input
        className="ui-input"
        placeholder="nick#TAG4 (ej: backset#TAKE)"
        value={playerHandle}
        onChange={(event) => setPlayerHandle(event.target.value)}
        required
      />
      <button className="ui-button shrink-0" type="submit" disabled={isPending}>
        <span className="inline-flex items-center gap-1.5">
          <Icon name="user-plus" size="sm" />
          {isPending ? 'Agregando...' : 'Agregar'}
        </span>
      </button>
    </form>
  )
}