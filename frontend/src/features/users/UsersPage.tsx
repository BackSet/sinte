import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, getApiErrorMessage } from '../../lib/api-client'
import { ResponsiveSection } from '../../components/ui/ResponsiveSection'
import { ResponsiveTable } from '../../components/ui/ResponsiveTable'
import { useConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToastStore } from '../../store/toast-store'

type UserItem = {
  id: string
  fullName: string
  email: string
  phone: string
  nickname?: string
  nicknameTag?: string
  playerHandle?: string
  active: boolean
  roles: string[]
}

export function UsersPage() {
  const queryClient = useQueryClient()
  const addToast = useToastStore((s) => s.addToast)
  const { ConfirmDialogComponent, requestConfirm } = useConfirmDialog()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await apiClient.get<UserItem[]>('/api/v1/users?page=0&size=100')
      return response.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/api/v1/users', {
        fullName,
        email,
        phone,
        nickname: nickname || undefined,
        password,
        initialRole: 'PLAYER',
      })
    },
    onSuccess: () => {
      setFullName('')
      setEmail('')
      setPhone('')
      setNickname('')
      setPassword('')
      addToast('success', 'Usuario creado correctamente')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error) => {
      addToast('error', getApiErrorMessage(error, 'No se pudo crear el usuario'))
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ userId, active }: { userId: string; active: boolean }) => {
      await apiClient.patch(`/api/v1/users/${userId}/active?value=${!active}`)
    },
    onSuccess: () => {
      addToast('success', 'Estado del usuario actualizado')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error) => {
      addToast('error', getApiErrorMessage(error, 'No se pudo cambiar el estado del usuario'))
    },
  })

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    createMutation.mutate()
  }

  const handleToggleActive = async (user: UserItem) => {
    const confirmed = await requestConfirm({
      title: user.active ? 'Desactivar usuario' : 'Activar usuario',
      description: user.active
        ? `Seguro que deseas desactivar a ${user.fullName}? No podra iniciar sesion.`
        : `Seguro que deseas reactivar a ${user.fullName}?`,
      confirmLabel: user.active ? 'Desactivar' : 'Activar',
      variant: user.active ? 'danger' : 'default',
    })
    if (confirmed) {
      toggleMutation.mutate({ userId: user.id, active: user.active })
    }
  }

  return (
    <div className="space-y-6">
      {ConfirmDialogComponent}

      <ResponsiveSection title="Crear usuario" description="Alta rapida de jugadores y staff">
        <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={onSubmit}>
          <input className="ui-input" aria-label="Nombre completo" placeholder="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <input className="ui-input" aria-label="Correo" placeholder="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="ui-input" aria-label="Telefono" placeholder="Telefono" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <input className="ui-input" aria-label="Apodo" placeholder="Apodo (opcional)" value={nickname} onChange={(e) => setNickname(e.target.value)} />
          <input className="ui-input md:col-span-2" placeholder="Contrasena temporal" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button className="ui-button md:col-span-2" type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Guardando...' : 'Guardar usuario'}
          </button>
          {createMutation.isError && (
            <p className="md:col-span-2 text-sm text-[var(--danger)]">
              {getApiErrorMessage(createMutation.error, 'No se pudo crear el usuario.')}
            </p>
          )}
        </form>
      </ResponsiveSection>

      <ResponsiveSection title="Listado de usuarios">
        {usersQuery.isLoading && <p className="ui-text-muted mt-3 text-sm">Cargando usuarios...</p>}
        {usersQuery.isError && <p className="mt-3 text-sm text-[var(--danger)]">No se pudo cargar el listado de usuarios.</p>}
        {usersQuery.data && (
          <ResponsiveTable
            data={usersQuery.data}
            rowKey={(user) => user.id}
            emptyMessage="Sin usuarios registrados."
            columns={[
              { key: 'name', label: 'Nombre', render: (user) => (
                <div>
                  <p className="font-medium">{user.fullName}</p>
                  <p className="ui-text-muted text-xs">{user.email}</p>
                </div>
              )},
              { key: 'phone', label: 'Telefono', render: (user) => user.phone },
              { key: 'handle', label: 'Codigo', render: (user) => (
                <span className="ui-badge">{user.playerHandle ?? '-'}</span>
              )},
              { key: 'roles', label: 'Roles', render: (user) => user.roles.join(', ') || '-' },
              { key: 'status', label: 'Estado', render: (user) => (
                <span className={`ui-badge ${user.active ? 'ui-badge-success' : 'ui-badge-muted'}`}>
                  {user.active ? 'Activo' : 'Inactivo'}
                </span>
              )},
              {
                key: 'actions',
                label: '',
                className: 'text-right',
                render: (user) => (
                  <button
                    className="ui-button-muted"
                    onClick={() => handleToggleActive(user)}
                  >
                    Cambiar estado
                  </button>
                ),
              },
            ]}
            renderMobileCard={(user) => (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{user.fullName}</p>
                  <span className={`ui-badge ${user.active ? 'ui-badge-success' : 'ui-badge-muted'}`}>
                    {user.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <p className="ui-text-muted">{user.email}</p>
                <p className="ui-text-muted">Telefono: {user.phone}</p>
                <p className="ui-text-muted">Codigo: {user.playerHandle ?? '-'}</p>
                <p className="ui-text-muted">Roles: {user.roles.join(', ') || '-'}</p>
                <button
                  className="ui-button-muted"
                  onClick={() => handleToggleActive(user)}
                >
                  Cambiar estado
                </button>
              </div>
            )}
          />
        )}
      </ResponsiveSection>
    </div>
  )
}