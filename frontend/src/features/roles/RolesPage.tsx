import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, getApiErrorMessage } from '../../lib/api-client'
import { ResponsiveSection } from '../../components/ui/ResponsiveSection'
import { ResponsiveTable } from '../../components/ui/ResponsiveTable'
import { Modal } from '../../components/ui/Modal'
import { FormField } from '../../components/ui/FormField'
import { useToastStore } from '../../store/toast-store'

type RoleItem = { id: number; code: string; name: string }
type UserItem = { id: string; fullName: string; roles: string[] }

export function RolesPage() {
  const queryClient = useQueryClient()
  const addToast = useToastStore((s) => s.addToast)
  const [modalOpen, setModalOpen] = useState(false)
  const [userId, setUserId] = useState('')
  const [roleCode, setRoleCode] = useState('PLAYER')

  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: async () => (await apiClient.get<RoleItem[]>('/api/v1/roles')).data,
  })

  const usersQuery = useQuery({
    queryKey: ['users-for-roles'],
    queryFn: async () => (await apiClient.get<UserItem[]>('/api/v1/users?page=0&size=100')).data,
  })

  const assignMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/api/v1/roles/users/${userId}/assign`, { roleCode })
    },
    onSuccess: () => {
      addToast('success', 'Rol asignado correctamente')
      queryClient.invalidateQueries({ queryKey: ['users-for-roles'] })
      setModalOpen(false)
      setUserId('')
      setRoleCode('PLAYER')
    },
    onError: (error) => {
      addToast('error', getApiErrorMessage(error, 'No se pudo asignar el rol'))
    },
  })

  const handleAssign = () => {
    if (!userId) return
    assignMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <ResponsiveSection
        title="Usuarios y roles"
        description="Gestiona permisos por usuario"
        action={
          <button className="ui-button" onClick={() => setModalOpen(true)}>
            Asignar rol
          </button>
        }
      >
        {usersQuery.isLoading && <p className="ui-text-muted mt-3 text-sm">Cargando usuarios...</p>}
        {usersQuery.isError && <p className="mt-3 text-sm text-[var(--danger)]">No se pudo cargar el listado.</p>}
        {usersQuery.data && (
          <ResponsiveTable
            data={usersQuery.data}
            rowKey={(user) => user.id}
            emptyMessage="Sin usuarios para mostrar."
            columns={[
              { key: 'user', label: 'Usuario', render: (user) => user.fullName },
              { key: 'roles', label: 'Roles', render: (user) => user.roles.join(', ') || '-' },
            ]}
            renderMobileCard={(user) => (
              <div className="space-y-1 text-sm">
                <p className="font-semibold">{user.fullName}</p>
                <p className="ui-text-muted">Roles: {user.roles.join(', ') || '-'}</p>
              </div>
            )}
          />
        )}
      </ResponsiveSection>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        size="sm"
        title="Asignar rol"
        subtitle="Selecciona un usuario y un rol para asignar"
      >
        <FormField label="Usuario">
          <select className="ui-input" value={userId} onChange={(e) => setUserId(e.target.value)} required>
            <option value="">Selecciona usuario</option>
            {usersQuery.data?.map((user) => (
              <option key={user.id} value={user.id}>
                {user.fullName}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Rol">
          <select className="ui-input" value={roleCode} onChange={(e) => setRoleCode(e.target.value)}>
            {rolesQuery.data?.map((role) => (
              <option key={role.id} value={role.code}>
                {role.code}
              </option>
            ))}
          </select>
        </FormField>

        {assignMutation.isError && (
          <p className="text-sm text-[var(--danger)]">
            {getApiErrorMessage(assignMutation.error, 'No se pudo asignar el rol.')}
          </p>
        )}

        <Modal.Footer>
          <button className="ui-button-muted" onClick={() => setModalOpen(false)}>
            Cancelar
          </button>
          <button className="ui-button" onClick={handleAssign} disabled={assignMutation.isPending || !userId}>
            {assignMutation.isPending ? 'Asignando...' : 'Asignar'}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}
