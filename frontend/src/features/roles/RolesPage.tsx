import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../lib/api-client'
import { ResponsiveSection } from '../../components/ui/ResponsiveSection'
import { ResponsiveTable } from '../../components/ui/ResponsiveTable'
import { StatusBadge } from '../../components/ui/StatusBadge'

type RoleItem = { id: number; code: string; name: string }
type UserItem = { id: string; fullName: string; roles: string[] }

export function RolesPage() {
  const queryClient = useQueryClient()
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users-for-roles'] }),
  })

  const onAssign = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    assignMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <ResponsiveSection title="Asignar rol" description="Gestiona permisos por usuario">
        <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3" onSubmit={onAssign}>
          <select className="ui-input" value={userId} onChange={(e) => setUserId(e.target.value)} required>
            <option value="">Selecciona usuario</option>
            {usersQuery.data?.map((user) => (
              <option key={user.id} value={user.id}>
                {user.fullName}
              </option>
            ))}
          </select>
          <select className="ui-input" value={roleCode} onChange={(e) => setRoleCode(e.target.value)}>
            {rolesQuery.data?.map((role) => (
              <option key={role.id} value={role.code}>
                {role.code}
              </option>
            ))}
          </select>
          <button className="ui-button" type="submit" disabled={assignMutation.isPending}>
            Asignar
          </button>
        </form>
      </ResponsiveSection>

      <ResponsiveSection title="Usuarios y roles">
        {usersQuery.data && (
          <ResponsiveTable
            data={usersQuery.data}
            rowKey={(user) => user.id}
            emptyMessage="Sin usuarios para mostrar."
            columns={[
              { key: 'user', label: 'Usuario', render: (user) => user.fullName },
              {
                key: 'roles',
                label: 'Roles',
                render: (user) => (
                  <div className="flex flex-wrap gap-1">
                    {user.roles.length
                      ? user.roles.map((role) => <StatusBadge key={role} label={role} tone="info" />)
                      : <span className="ui-text-muted">-</span>}
                  </div>
                ),
              },
            ]}
            renderMobileCard={(user) => (
              <div className="space-y-1 text-sm">
                <p className="font-semibold">{user.fullName}</p>
                <div className="flex flex-wrap gap-1">
                  {user.roles.length
                    ? user.roles.map((role) => <StatusBadge key={role} label={role} tone="info" />)
                    : <span className="ui-text-muted">Sin roles</span>}
                </div>
              </div>
            )}
          />
        )}
      </ResponsiveSection>
    </div>
  )
}
