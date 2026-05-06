import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../lib/api-client'
import { ResponsiveSection } from '../../components/ui/ResponsiveSection'
import { ResponsiveTable } from '../../components/ui/ResponsiveTable'
import { PLAYER_POSITION_OPTIONS } from '../../lib/player-positions'
import type { PlayerPosition } from '../../lib/player-positions'
import { getApiErrorMessage } from '../../lib/api-client'
import { StatusBadge } from '../../components/ui/StatusBadge'

type UserItem = {
  id: string
  fullName: string
  email: string
  phone: string
  nickname?: string
  nicknameTag?: string
  playerHandle?: string
  primaryPosition?: PlayerPosition
  secondaryPosition?: PlayerPosition
  active: boolean
  roles: string[]
}

export function UsersPage() {
  const queryClient = useQueryClient()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [nickname, setNickname] = useState('')
  const [primaryPosition, setPrimaryPosition] = useState<PlayerPosition>('CENTRAL_MIDFIELDER')
  const [secondaryPosition, setSecondaryPosition] = useState<string>('')
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
        nickname,
        primaryPosition,
        secondaryPosition: secondaryPosition ? (secondaryPosition as PlayerPosition) : undefined,
        password,
        initialRole: 'PLAYER',
      })
    },
    onSuccess: () => {
      setFullName('')
      setEmail('')
      setPhone('')
      setNickname('')
      setPrimaryPosition('CENTRAL_MIDFIELDER')
      setSecondaryPosition('')
      setPassword('')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ userId, active }: { userId: string; active: boolean }) => {
      await apiClient.patch(`/api/v1/users/${userId}/active?value=${!active}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    createMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <ResponsiveSection title="Crear usuario" description="Alta rapida de jugadores y staff">
        <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={onSubmit}>
          <input className="ui-input" aria-label="Nombre completo" placeholder="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <input className="ui-input" aria-label="Correo" placeholder="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="ui-input" aria-label="Telefono" placeholder="Telefono" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <input className="ui-input" aria-label="Apodo" placeholder="Apodo (opcional)" value={nickname} onChange={(e) => setNickname(e.target.value)} />
          <select className="ui-input" aria-label="Posicion principal" value={primaryPosition} onChange={(e) => setPrimaryPosition(e.target.value as PlayerPosition)} required>
            {PLAYER_POSITION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select className="ui-input" aria-label="Posicion secundaria" value={secondaryPosition} onChange={(e) => setSecondaryPosition(e.target.value)}>
            <option value="">Sin secundaria</option>
            {PLAYER_POSITION_OPTIONS.filter((option) => option.value !== primaryPosition).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input className="ui-input md:col-span-2" placeholder="Contrasena temporal" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button className="ui-button md:col-span-2" type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Guardando...' : 'Guardar usuario'}
          </button>
          {createMutation.isError && (
            <p className="md:col-span-2 text-sm text-red-600">
              {getApiErrorMessage(createMutation.error, 'No se pudo crear el usuario.')}
            </p>
          )}
        </form>
      </ResponsiveSection>

      <ResponsiveSection title="Listado de usuarios">
        {usersQuery.isLoading && <p className="ui-text-muted mt-3 text-sm">Cargando usuarios...</p>}
        {usersQuery.isError && <p className="mt-3 text-sm text-red-600">No se pudo cargar el listado de usuarios.</p>}
        {usersQuery.data && (
          <ResponsiveTable
            data={usersQuery.data}
            rowKey={(user) => user.id}
            emptyMessage="Sin usuarios registrados."
            columns={[
              { key: 'name', label: 'Nombre', render: (user) => user.fullName },
              { key: 'email', label: 'Correo', render: (user) => user.email },
              { key: 'phone', label: 'Telefono', render: (user) => user.phone },
              { key: 'handle', label: 'Codigo jugador', render: (user) => user.playerHandle ?? '-' },
              { key: 'position', label: 'Posiciones', render: (user) => `${user.primaryPosition ?? '-'} / ${user.secondaryPosition ?? '-'}` },
              { key: 'roles', label: 'Roles', render: (user) => user.roles.join(', ') || '-' },
              {
                key: 'status',
                label: 'Estado',
                render: (user) => (
                  <StatusBadge label={user.active ? 'Activo' : 'Inactivo'} tone={user.active ? 'success' : 'neutral'} />
                ),
              },
              {
                key: 'actions',
                label: '',
                className: 'text-right',
                render: (user) => (
                  <button
                    className="ui-button-muted"
                    onClick={() => toggleMutation.mutate({ userId: user.id, active: user.active })}
                  >
                    Cambiar estado
                  </button>
                ),
              },
            ]}
            renderMobileCard={(user) => (
              <div className="space-y-2 text-sm">
                <p className="font-semibold">{user.fullName}</p>
                <p className="ui-text-muted">{user.email}</p>
                <p className="ui-text-muted">Telefono: {user.phone}</p>
                <p className="ui-text-muted">Codigo: {user.playerHandle ?? '-'}</p>
                <p className="ui-text-muted">Posiciones: {user.primaryPosition ?? '-'} / {user.secondaryPosition ?? '-'}</p>
                <p className="ui-text-muted">Roles: {user.roles.join(', ') || '-'}</p>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <StatusBadge label={user.active ? 'Activo' : 'Inactivo'} tone={user.active ? 'success' : 'neutral'} />
                  <button
                    className="ui-button-muted"
                    onClick={() => toggleMutation.mutate({ userId: user.id, active: user.active })}
                  >
                    Cambiar estado
                  </button>
                </div>
              </div>
            )}
          />
        )}
      </ResponsiveSection>
    </div>
  )
}
