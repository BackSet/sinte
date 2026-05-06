import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, getApiErrorMessage } from '../../lib/api-client'
import { ResponsiveSection } from '../../components/ui/ResponsiveSection'
import { ResponsiveTable } from '../../components/ui/ResponsiveTable'
import { StatusBadge } from '../../components/ui/StatusBadge'

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
  const [name, setName] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [playerHandle, setPlayerHandle] = useState('')

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
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
  })

  const setActiveMutation = useMutation({
    mutationFn: async ({ groupId, value }: { groupId: string; value: boolean }) => {
      await apiClient.patch(`/api/v1/groups/${groupId}/active?value=${value}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  })

  const addMemberMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/api/v1/groups/${selectedGroupId}/members`, { playerHandle })
    },
    onSuccess: () => {
      setPlayerHandle('')
      queryClient.invalidateQueries({ queryKey: ['group-members', selectedGroupId] })
    },
  })

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiClient.delete(`/api/v1/groups/${selectedGroupId}/members/${userId}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['group-members', selectedGroupId] }),
  })

  const onCreateGroup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    createMutation.mutate()
  }

  const onAddMember = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedGroupId) return
    addMemberMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <ResponsiveSection title="Crear grupo" description="Organiza jugadores por grupos para convocatorias y avisos">
        <form className="mt-4 flex flex-col gap-3 md:flex-row" onSubmit={onCreateGroup}>
          <input
            className="ui-input"
            placeholder="Nombre del grupo"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <button className="ui-button" type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creando...' : 'Crear grupo'}
          </button>
        </form>
        {createMutation.isError && (
          <p className="mt-2 text-sm text-red-600">
            {getApiErrorMessage(createMutation.error, 'No se pudo crear el grupo.')}
          </p>
        )}
      </ResponsiveSection>

      <ResponsiveSection
        title="Grupos"
        description={`Total: ${(groupsQuery.data ?? []).length} grupos | Activos: ${activeGroups.length}`}
      >
        {groupsQuery.isLoading && <p className="ui-text-muted mt-3 text-sm">Cargando grupos...</p>}
        {groupsQuery.isError && <p className="mt-3 text-sm text-red-600">No se pudieron cargar los grupos.</p>}
        {groupsQuery.data && (
          <ResponsiveTable
            data={groupsQuery.data}
            rowKey={(group) => group.id}
            emptyMessage="No hay grupos registrados."
            columns={[
              { key: 'name', label: 'Nombre', render: (group) => group.name },
              {
                key: 'status',
                label: 'Estado',
                render: (group) => (
                  <StatusBadge label={group.active ? 'Activo' : 'Inactivo'} tone={group.active ? 'success' : 'neutral'} />
                ),
              },
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
                      className="ui-button-muted"
                      onClick={() => setActiveMutation.mutate({ groupId: group.id, value: !group.active })}
                    >
                      {group.active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                ),
              },
            ]}
            renderMobileCard={(group) => (
              <div className="space-y-2 text-sm">
                <p className="font-semibold">{group.name}</p>
                <StatusBadge label={group.active ? 'Activo' : 'Inactivo'} tone={group.active ? 'success' : 'neutral'} />
                <div className="flex flex-wrap gap-2">
                  <button className="ui-button-muted" onClick={() => setSelectedGroupId(group.id)}>
                    Ver miembros
                  </button>
                  <button
                    className="ui-button-muted"
                    onClick={() => setActiveMutation.mutate({ groupId: group.id, value: !group.active })}
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
      >
        <form className="mt-4 flex flex-col gap-3 md:flex-row" onSubmit={onAddMember}>
          <select
            className="ui-input"
            value={selectedGroupId}
            onChange={(event) => setSelectedGroupId(event.target.value)}
            required
          >
            <option value="">Selecciona grupo</option>
            {activeGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          <input
            className="ui-input"
            placeholder="nick#TAG4 (ej: backset#TAKE)"
            value={playerHandle}
            onChange={(event) => setPlayerHandle(event.target.value)}
            required
          />
          <button className="ui-button" type="submit" disabled={addMemberMutation.isPending || !selectedGroupId}>
            {addMemberMutation.isPending ? 'Agregando...' : 'Agregar jugador'}
          </button>
        </form>
        {(addMemberMutation.isError || removeMemberMutation.isError || setActiveMutation.isError) && (
          <p className="mt-2 text-sm text-red-600">
            {getApiErrorMessage(
              addMemberMutation.error ?? removeMemberMutation.error ?? setActiveMutation.error,
              'No se pudo completar la accion sobre el grupo.',
            )}
          </p>
        )}

        {membersQuery.isLoading && selectedGroupId && (
          <p className="ui-text-muted mt-3 text-sm">Cargando miembros...</p>
        )}
        {membersQuery.isError && selectedGroupId && (
          <p className="mt-3 text-sm text-red-600">No se pudieron cargar los miembros de este grupo.</p>
        )}

        {membersQuery.data && (
          <div className="mt-4">
            <ResponsiveTable
              data={membersQuery.data}
              rowKey={(member) => member.userId}
              emptyMessage="El grupo no tiene jugadores."
              columns={[
                { key: 'name', label: 'Nombre', render: (member) => member.fullName },
                { key: 'email', label: 'Correo', render: (member) => member.email },
                { key: 'handle', label: 'Codigo jugador', render: (member) => member.playerHandle ?? '-' },
                {
                  key: 'actions',
                  label: '',
                  className: 'text-right',
                  render: (member) => (
                    <button className="ui-button-muted" onClick={() => removeMemberMutation.mutate(member.userId)} disabled={removeMemberMutation.isPending}>
                      {removeMemberMutation.isPending ? 'Quitando...' : 'Quitar'}
                    </button>
                  ),
                },
              ]}
              renderMobileCard={(member) => (
                <div className="space-y-2 text-sm">
                  <p className="font-semibold">{member.fullName}</p>
                  <p className="ui-text-muted">{member.email}</p>
                  <p className="ui-text-muted">Codigo: {member.playerHandle ?? '-'}</p>
                  <button className="ui-button-muted" onClick={() => removeMemberMutation.mutate(member.userId)} disabled={removeMemberMutation.isPending}>
                    {removeMemberMutation.isPending ? 'Quitando...' : 'Quitar'}
                  </button>
                </div>
              )}
            />
          </div>
        )}
      </ResponsiveSection>
    </div>
  )
}
