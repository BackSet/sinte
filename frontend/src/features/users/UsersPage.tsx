import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, getApiErrorMessage } from '../../lib/api-client'
import { ResponsiveSection } from '../../components/ui/ResponsiveSection'
import { ResponsiveTable } from '../../components/ui/ResponsiveTable'
import { useConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToastStore } from '../../store/toast-store'
import { PLAYER_POSITION_OPTIONS } from '../../lib/player-positions'

const POSITION_LABELS: Record<string, string> = Object.fromEntries(
  PLAYER_POSITION_OPTIONS.map((opt) => [opt.value, opt.label]),
)

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

type UserPositionItem = {
  id: string
  positionCode: string
  priority: number
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
  const [editingPositionsUserId, setEditingPositionsUserId] = useState<string | null>(null)
  const [selectedPositions, setSelectedPositions] = useState<string[]>([])

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await apiClient.get<UserItem[]>('/api/v1/users?page=0&size=100')
      return response.data
    },
  })

  const positionsQuery = useQuery({
    queryKey: ['user-positions', editingPositionsUserId],
    queryFn: async () => {
      const response = await apiClient.get<UserPositionItem[]>(`/api/v1/users/${editingPositionsUserId}/positions`)
      return response.data
    },
    enabled: Boolean(editingPositionsUserId),
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

  const savePositionsMutation = useMutation({
    mutationFn: async () => {
      const assignments = selectedPositions.map((code, index) => ({
        positionCode: code,
        priority: index + 1,
      }))
      await apiClient.put(`/api/v1/users/${editingPositionsUserId}/positions`, assignments)
    },
    onSuccess: () => {
      addToast('success', 'Posiciones actualizadas')
      setEditingPositionsUserId(null)
      setSelectedPositions([])
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error) => {
      addToast('error', getApiErrorMessage(error, 'No se pudieron guardar las posiciones'))
    },
  })

  const deletePositionMutation = useMutation({
    mutationFn: async ({ userId, positionCode }: { userId: string; positionCode: string }) => {
      await apiClient.delete(`/api/v1/users/${userId}/positions/${positionCode}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-positions', editingPositionsUserId] })
      addToast('success', 'Posicion eliminada')
    },
    onError: (error) => {
      addToast('error', getApiErrorMessage(error, 'No se pudo eliminar la posicion'))
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

  const openPositionsEditor = (user: UserItem) => {
    setEditingPositionsUserId(user.id)
    setSelectedPositions([])
  }

  const cancelPositionsEditor = () => {
    setEditingPositionsUserId(null)
    setSelectedPositions([])
  }

  const togglePositionSelection = (code: string) => {
    setSelectedPositions((prev) => {
      if (prev.includes(code)) {
        return prev.filter((c) => c !== code)
      }
      return [...prev, code]
    })
  }

  const editingUser = usersQuery.data?.find((u) => u.id === editingPositionsUserId)
  const currentPositions = positionsQuery.data ?? []

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
                  <div className="flex justify-end gap-2">
                    <button className="ui-button-muted" onClick={() => openPositionsEditor(user)}>
                      Posiciones
                    </button>
                    <button className="ui-button-muted" onClick={() => handleToggleActive(user)}>
                      Cambiar estado
                    </button>
                  </div>
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
                <div className="flex gap-2">
                  <button className="ui-button-muted" onClick={() => openPositionsEditor(user)}>
                    Posiciones
                  </button>
                  <button className="ui-button-muted" onClick={() => handleToggleActive(user)}>
                    Cambiar estado
                  </button>
                </div>
              </div>
            )}
          />
        )}
      </ResponsiveSection>

      {editingPositionsUserId && editingUser && (
        <ResponsiveSection
          title={`Posiciones de ${editingUser.fullName}`}
          description="Selecciona las posiciones en orden de prioridad"
        >
          <div className="mt-4 space-y-4">
            {currentPositions.length > 0 && (
              <div className="ui-section-card">
                <div className="ui-section-header">
                  <h3>Posiciones actuales</h3>
                </div>
                <div className="space-y-1 text-sm">
                  {currentPositions
                    .sort((a, b) => a.priority - b.priority)
                    .map((pos) => (
                      <div key={pos.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                        <span>
                          <span className="ui-text-muted mr-2 text-xs">#{pos.priority}</span>
                          {POSITION_LABELS[pos.positionCode] ?? pos.positionCode}
                        </span>
                        <button
                          className="text-xs text-[var(--danger)] hover:underline"
                          onClick={() => deletePositionMutation.mutate({ userId: editingPositionsUserId!, positionCode: pos.positionCode })}
                          disabled={deletePositionMutation.isPending}
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="ui-section-card">
              <div className="ui-section-header">
                <h3>Agregar posiciones</h3>
              </div>
              <p className="ui-text-muted mb-3 text-xs">Selecciona en orden de preferencia. La primera seleccionada sera la posicion principal.</p>
              <div className="flex flex-wrap gap-2">
                {PLAYER_POSITION_OPTIONS.map((opt) => {
                  const isSelected = selectedPositions.includes(opt.value)
                  const priority = selectedPositions.indexOf(opt.value) + 1
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      className={`rounded-md border px-3 py-1.5 text-sm ${
                        isSelected
                          ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                          : 'border-[var(--border)]'
                      }`}
                      onClick={() => togglePositionSelection(opt.value)}
                    >
                      {isSelected ? `#${priority} ` : ''}{opt.label}
                    </button>
                  )
                })}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  className="ui-button"
                  onClick={() => savePositionsMutation.mutate()}
                  disabled={savePositionsMutation.isPending || selectedPositions.length === 0}
                >
                  {savePositionsMutation.isPending ? 'Guardando...' : 'Guardar posiciones'}
                </button>
                <button className="ui-button-muted" onClick={cancelPositionsEditor}>
                  Cancelar
                </button>
              </div>
              {savePositionsMutation.isError && (
                <p className="mt-2 text-sm text-[var(--danger)]">
                  {getApiErrorMessage(savePositionsMutation.error, 'No se pudieron guardar las posiciones.')}
                </p>
              )}
            </div>
          </div>
        </ResponsiveSection>
      )}
    </div>
  )
}