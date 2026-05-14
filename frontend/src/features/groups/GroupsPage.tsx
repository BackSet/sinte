import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, getApiErrorMessage } from '../../lib/api-client'
import { ResponsiveSection } from '../../components/ui/ResponsiveSection'
import { ResponsiveTable } from '../../components/ui/ResponsiveTable'
import { Modal } from '../../components/ui/Modal'
import { FormField } from '../../components/ui/FormField'
import { PlayerSelector } from '../../components/ui/PlayerSelector'
import { useConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Icon } from '../../components/ui/Icon'
import { useToastStore } from '../../store/toast-store'

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
  rol?: string
  addedAt: string
}

export function GroupsPage() {
  const queryClient = useQueryClient()
  const addToast = useToastStore((s) => s.addToast)
  const { ConfirmDialogComponent, requestConfirm } = useConfirmDialog()

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [membersModalOpen, setMembersModalOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<GroupItem | null>(null)
  const [groupName, setGroupName] = useState('')
  const [memberMode, setMemberMode] = useState<'select' | 'manual'>('select')
  const [manualHandle, setManualHandle] = useState('')

  const groupsQuery = useQuery({
    queryKey: ['groups'],
    queryFn: async () => (await apiClient.get<GroupItem[]>('/api/v1/groups')).data,
  })

  const membersQuery = useQuery({
    queryKey: ['group-members', selectedGroup?.id],
    queryFn: async () =>
      (await apiClient.get<GroupMemberItem[]>(`/api/v1/groups/${selectedGroup!.id}/members`)).data,
    enabled: Boolean(selectedGroup),
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/api/v1/groups', { name: groupName })
    },
    onSuccess: () => {
      addToast('success', `Grupo "${groupName}" creado`)
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      setCreateModalOpen(false)
      setGroupName('')
    },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'No se pudo crear el grupo')),
  })

  const setActiveMutation = useMutation({
    mutationFn: async ({ groupId, value }: { groupId: string; value: boolean }) => {
      await apiClient.patch(`/api/v1/groups/${groupId}/active?value=${value}`)
    },
    onSuccess: () => {
      addToast('success', 'Estado del grupo actualizado')
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'No se pudo cambiar el estado del grupo')),
  })

  const addMemberMutation = useMutation({
    mutationFn: async (playerHandle: string) => {
      await apiClient.post(`/api/v1/groups/${selectedGroup!.id}/members`, { playerHandle })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', selectedGroup?.id] })
    },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'No se pudo agregar el jugador')),
  })

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiClient.delete(`/api/v1/groups/${selectedGroup!.id}/members/${userId}`)
    },
    onSuccess: () => {
      addToast('success', 'Jugador removido del grupo')
      queryClient.invalidateQueries({ queryKey: ['group-members', selectedGroup?.id] })
    },
    onError: (error) => addToast('error', getApiErrorMessage(error, 'No se pudo remover el jugador')),
  })

  const openMembers = (group: GroupItem) => {
    setSelectedGroup(group)
    setMembersModalOpen(true)
  }

  const handleToggleActive = async (group: GroupItem) => {
    const confirmed = await requestConfirm({
      title: group.active ? 'Desactivar grupo' : 'Activar grupo',
      description: group.active
        ? `Seguro que deseas desactivar "${group.name}"? Los jugadores no podran ser convocados a traves de este grupo.`
        : `Seguro que deseas reactivar "${group.name}"?`,
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
      description: `Seguro que deseas sacar a ${member.fullName} de "${selectedGroup?.name}"?`,
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

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualHandle.trim()) return
    addMemberMutation.mutate(manualHandle.trim())
    setManualHandle('')
  }

  return (
    <div className="space-y-6">
      {ConfirmDialogComponent}

      <ResponsiveSection
        title="Grupos"
        description="Organiza jugadores por grupos para convocatorias y avisos"
        action={
          <button className="ui-button" onClick={() => setCreateModalOpen(true)} title="Nuevo grupo">
            <Icon name="user-plus" size="sm" />
            <span>Nuevo grupo</span>
          </button>
        }
      >
        {groupsQuery.isLoading && <p className="ui-text-muted mt-3 text-sm">Cargando grupos...</p>}
        {groupsQuery.isError && <p className="mt-3 text-sm text-[var(--danger)]">No se pudieron cargar los grupos.</p>}
        {groupsQuery.data && (
          <ResponsiveTable
            data={groupsQuery.data}
            rowKey={(group) => group.id}
            emptyMessage="No hay grupos registrados."
            emptyIcon="groups"
            columns={[
              { key: 'name', label: 'Nombre', render: (group) => group.name },
              { key: 'status', label: 'Estado', render: (group) => (
                <span className={`ui-badge ${group.active ? 'ui-badge-success' : 'ui-badge-muted'}`}>
                  {group.active ? 'Activo' : 'Inactivo'}
                </span>
              )},
              {
                key: 'actions',
                label: '',
                className: 'text-right',
                render: (group) => (
                  <div className="flex justify-end gap-1">
                    <button className="ui-icon-btn" onClick={() => openMembers(group)} title="Ver miembros">
                      <Icon name="eye" size="sm" />
                    </button>
                    <button
                      className={group.active ? 'ui-icon-btn ui-icon-btn-danger' : 'ui-icon-btn'}
                      onClick={() => handleToggleActive(group)}
                      title={group.active ? 'Desactivar' : 'Activar'}
                    >
                      <Icon name={group.active ? 'x' : 'check'} size="sm" />
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
                <div className="flex flex-wrap gap-1">
                  <button className="ui-icon-btn" onClick={() => openMembers(group)} title="Ver miembros">
                    <Icon name="eye" size="sm" />
                  </button>
                  <button
                    className={group.active ? 'ui-icon-btn ui-icon-btn-danger' : 'ui-icon-btn'}
                    onClick={() => handleToggleActive(group)}
                    title={group.active ? 'Desactivar' : 'Activar'}
                  >
                    <Icon name={group.active ? 'x' : 'check'} size="sm" />
                  </button>
                </div>
              </div>
            )}
          />
        )}
      </ResponsiveSection>

      {/* Create Group Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => { setCreateModalOpen(false); setGroupName(''); }}
        size="sm"
        title="Nuevo grupo"
        subtitle="Organiza jugadores para convocatorias y avisos"
      >
        <FormField label="Nombre del grupo" required>
          <input
            className="ui-input"
            placeholder="Ej: Titulares, Suplentes"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            required
          />
        </FormField>

        {createMutation.isError && (
          <p className="text-sm text-[var(--danger)]">
            {getApiErrorMessage(createMutation.error, 'No se pudo crear el grupo.')}
          </p>
        )}

        <Modal.Footer>
          <button className="ui-button-muted" onClick={() => { setCreateModalOpen(false); setGroupName(''); }} title="Cancelar">
            <Icon name="x" size="sm" />
            <span>Cancelar</span>
          </button>
          <button className="ui-button" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !groupName.trim()} title="Crear grupo">
            <Icon name="check" size="sm" />
            <span>{createMutation.isPending ? 'Creando...' : 'Crear grupo'}</span>
          </button>
        </Modal.Footer>
      </Modal>

      {/* Members Modal */}
      {selectedGroup && (
        <Modal
          open={membersModalOpen}
          onClose={() => { setMembersModalOpen(false); setSelectedGroup(null); }}
          size="lg"
          title="Miembros del grupo"
          subtitle={selectedGroup.name}
        >
          {/* Add members section */}
          <div className="ui-detail-section">
            <p className="ui-detail-section-title">Agregar jugadores</p>
            <div className="mb-3 flex gap-1">
              <button
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${memberMode === 'select' ? 'bg-[var(--accent)] text-[var(--accent-contrast)]' : 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'}`}
                onClick={() => setMemberMode('select')}
              >
                Seleccionar
              </button>
              <button
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${memberMode === 'manual' ? 'bg-[var(--accent)] text-[var(--accent-contrast)]' : 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'}`}
                onClick={() => setMemberMode('manual')}
              >
                Codigo manual
              </button>
            </div>

            {memberMode === 'select' ? (
              <PlayerSelector
                existingMemberIds={existingMemberIds}
                onAddPlayer={handleAddPlayer}
                isAdding={addMemberMutation.isPending}
              />
            ) : (
              <form className="flex flex-col gap-2 sm:flex-row" onSubmit={handleManualSubmit}>
                <input
                  className="ui-input"
                  placeholder="nick#TAG4 (ej: backset#TAKE)"
                  value={manualHandle}
                  onChange={(e) => setManualHandle(e.target.value)}
                  required
                />
                <button className="ui-button shrink-0" type="submit" disabled={addMemberMutation.isPending} title="Agregar">
                  <Icon name="user-plus" size="sm" />
                  <span>Agregar</span>
                </button>
              </form>
            )}
          </div>

          <hr className="ui-section-divider" />

          {/* Members list */}
          <div className="ui-detail-section">
            <p className="ui-detail-section-title">
              Miembros ({membersQuery.data?.length ?? 0})
            </p>

            {membersQuery.isLoading && <p className="ui-text-muted text-sm">Cargando miembros...</p>}
            {membersQuery.isError && <p className="text-sm text-[var(--danger)]">No se pudieron cargar los miembros.</p>}

            {membersQuery.data && membersQuery.data.length === 0 && (
              <p className="ui-text-muted text-sm">El grupo no tiene jugadores.</p>
            )}

            {membersQuery.data && membersQuery.data.length > 0 && (
              <ResponsiveTable
                data={membersQuery.data}
                rowKey={(member) => member.userId}
                emptyMessage="Sin miembros."
                emptyIcon="users"
                columns={[
                  { key: 'name', label: 'Nombre', render: (member) => (
                    <div>
                      <p className="font-medium">{member.fullName}</p>
                      <p className="ui-text-muted text-xs">{member.email}</p>
                    </div>
                  )},
                  ...(membersQuery.data?.some(m => m.rol || m.playerHandle)
                    ? [{
                        key: 'badges',
                        label: 'Codigo / Rol',
                        render: (member: GroupMemberItem) => (
                          <div className="flex items-center gap-1">
                            {member.playerHandle && <span className="ui-badge">{member.playerHandle}</span>}
                            {member.rol && <span className="ui-badge ui-badge-muted">{member.rol}</span>}
                          </div>
                        )
                      }]
                    : []),
                  {
                    key: 'actions',
                    label: '',
                    className: 'text-right',
                    render: (member) => (
                      <button
                        className="ui-icon-btn ui-icon-btn-danger"
                        onClick={() => handleRemoveMember(member)}
                        disabled={removeMemberMutation.isPending}
                        title="Quitar miembro"
                      >
                        <Icon name="trash" size="sm" />
                      </button>
                    ),
                  },
                ]}
                renderMobileCard={(member) => (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{member.fullName}</p>
                        <p className="ui-text-muted text-xs">{member.email}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {member.playerHandle && <span className="ui-badge">{member.playerHandle}</span>}
                        {member.rol && <span className="ui-badge ui-badge-muted">{member.rol}</span>}
                      </div>
                    </div>
                    <button
                      className="ui-icon-btn ui-icon-btn-danger"
                      onClick={() => handleRemoveMember(member)}
                      disabled={removeMemberMutation.isPending}
                      title="Quitar del grupo"
                    >
                      <Icon name="trash" size="sm" />
                    </button>
                  </div>
                )}
              />
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
