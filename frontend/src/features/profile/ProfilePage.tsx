import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, getApiErrorMessage } from '../../lib/api-client'
import { useAuthStore } from '../../store/auth-store'
import { useToastStore } from '../../store/toast-store'
import { ResponsiveSection } from '../../components/ui/ResponsiveSection'
import { Icon } from '../../components/ui/Icon'
import { PLAYER_POSITION_OPTIONS, type PlayerPosition } from '../../lib/player-positions'

type ProfileData = {
  userId: string
  email: string
  fullName: string
  phone: string
  nickname?: string
  nicknameTag?: string
  playerHandle?: string
  shirtNumber: number
  roles: string[]
}

type PositionEntry = {
  id: string
  positionCode: string
  priority: number
}

export function ProfilePage() {
  const queryClient = useQueryClient()
  const addToast = useToastStore((s) => s.addToast)
  const setSession = useAuthStore((s) => s.setSession)
  const accessToken = useAuthStore((s) => s.accessToken)
  const refreshToken = useAuthStore((s) => s.refreshToken)

  const profileQuery = useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => (await apiClient.get<ProfileData>('/api/v1/auth/me')).data,
  })

  const positionsQuery = useQuery({
    queryKey: ['my-positions'],
    queryFn: async () => (await apiClient.get<PositionEntry[]>('/api/v1/auth/me/positions')).data,
  })

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    nickname: '',
    nicknameTag: '',
    shirtNumber: 0,
  })
  const [selectedPositions, setSelectedPositions] = useState<Array<{ positionCode: string; priority: number }>>([])

  useEffect(() => {
    if (profileQuery.data) {
      setForm({
        fullName: profileQuery.data.fullName,
        email: profileQuery.data.email,
        phone: profileQuery.data.phone,
        nickname: profileQuery.data.nickname ?? '',
        nicknameTag: profileQuery.data.nicknameTag ?? '',
        shirtNumber: profileQuery.data.shirtNumber,
      })
    }
  }, [profileQuery.data])

  useEffect(() => {
    if (positionsQuery.data) {
      setSelectedPositions(positionsQuery.data.map((p) => ({ positionCode: p.positionCode, priority: p.priority })))
    }
  }, [positionsQuery.data])

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const response = await apiClient.put<ProfileData>('/api/v1/auth/me', payload)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] })
      if (accessToken && refreshToken) {
        setSession({
          accessToken,
          refreshToken,
          user: {
            userId: data.userId,
            email: data.email,
            fullName: data.fullName,
            phone: data.phone,
            nickname: data.nickname,
            nicknameTag: data.nicknameTag,
            playerHandle: data.playerHandle,
            roles: data.roles,
          },
        })
      }
      addToast('success', 'Perfil actualizado')
    },
    onError: (error) => {
      addToast('error', getApiErrorMessage(error, 'No se pudo actualizar el perfil'))
    },
  })

  const updatePositionsMutation = useMutation({
    mutationFn: async (positions: Array<{ positionCode: string; priority: number }>) => {
      const response = await apiClient.put<PositionEntry[]>('/api/v1/auth/me/positions', positions)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-positions'] })
      addToast('success', 'Posiciones actualizadas')
    },
    onError: (error) => {
      addToast('error', getApiErrorMessage(error, 'No se pudieron actualizar las posiciones'))
    },
  })

  function handleFieldChange(field: keyof typeof form, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateProfileMutation.mutate(form)
  }

  function togglePosition(code: PlayerPosition) {
    setSelectedPositions((prev) => {
      const exists = prev.find((p) => p.positionCode === code)
      if (exists) {
        return prev.filter((p) => p.positionCode !== code)
      }
      return [...prev, { positionCode: code, priority: prev.length + 1 }]
    })
  }

  function handlePositionsSubmit() {
    updatePositionsMutation.mutate(selectedPositions)
  }

  if (profileQuery.isLoading) {
    return (
      <ResponsiveSection title="Mi perfil">
        <p className="ui-text-muted mt-3 text-sm">Cargando perfil...</p>
      </ResponsiveSection>
    )
  }

  if (profileQuery.isError) {
    return (
      <ResponsiveSection title="Mi perfil">
        <p className="mt-3 text-sm text-[var(--danger)]">No se pudo cargar el perfil.</p>
      </ResponsiveSection>
    )
  }

  return (
    <div className="space-y-4">
      <ResponsiveSection title="Mi perfil" description="Edita tu informacion personal">
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="ui-text-muted mb-1 block text-xs font-medium">Nombre completo</span>
              <input
                type="text"
                className="ui-input w-full"
                value={form.fullName}
                onChange={(e) => handleFieldChange('fullName', e.target.value)}
                required
                maxLength={120}
              />
            </label>
            <label className="block">
              <span className="ui-text-muted mb-1 block text-xs font-medium">Correo electronico</span>
              <input
                type="email"
                className="ui-input w-full"
                value={form.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                required
                maxLength={180}
              />
            </label>
            <label className="block">
              <span className="ui-text-muted mb-1 block text-xs font-medium">Telefono</span>
              <input
                type="text"
                className="ui-input w-full"
                value={form.phone}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                required
                maxLength={30}
              />
            </label>
            <label className="block">
              <span className="ui-text-muted mb-1 block text-xs font-medium">Nickname</span>
              <input
                type="text"
                className="ui-input w-full"
                value={form.nickname}
                onChange={(e) => handleFieldChange('nickname', e.target.value)}
                maxLength={80}
                placeholder="Ej: crack"
              />
            </label>
            <label className="block">
              <span className="ui-text-muted mb-1 block text-xs font-medium">Tag</span>
              <input
                type="text"
                className="ui-input w-full"
                value={form.nicknameTag}
                onChange={(e) => handleFieldChange('nicknameTag', e.target.value.toUpperCase())}
                maxLength={10}
                placeholder="Ej: MITEAM123"
              />
            </label>
            <label className="block">
              <span className="ui-text-muted mb-1 block text-xs font-medium">Numero de camiseta</span>
              <input
                type="number"
                className="ui-input w-full"
                value={form.shirtNumber}
                onChange={(e) => handleFieldChange('shirtNumber', parseInt(e.target.value) || 0)}
                min={0}
                max={99}
              />
            </label>
            {profileQuery.data?.playerHandle && (
              <div className="block">
                <span className="ui-text-muted mb-1 block text-xs font-medium">Tu handle</span>
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Icon name="users" size="sm" className="ui-text-muted" />
                  {profileQuery.data.playerHandle}
                </p>
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="ui-button-primary"
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? 'Guardando...' : 'Guardar perfil'}
            </button>
          </div>
        </form>
      </ResponsiveSection>

      <ResponsiveSection title="Posiciones" description="Selecciona tus posiciones y ordenalas por prioridad">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {PLAYER_POSITION_OPTIONS.map((pos) => {
              const selected = selectedPositions.find((p) => p.positionCode === pos.value)
              return (
                <button
                  key={pos.value}
                  type="button"
                  onClick={() => togglePosition(pos.value)}
                  className={`ui-badge cursor-pointer transition-colors ${
                    selected
                      ? 'ui-badge-primary'
                      : 'ui-badge-muted hover:opacity-80'
                  }`}
                >
                  {selected && <span className="mr-1 text-[10px] font-bold">{selected.priority}</span>}
                  {pos.label}
                </button>
              )
            })}
          </div>
          {selectedPositions.length > 0 && (
            <p className="ui-text-muted text-xs">
              Seleccionadas: {selectedPositions.map((p) => {
                const opt = PLAYER_POSITION_OPTIONS.find((o) => o.value === p.positionCode)
                return opt?.label ?? p.positionCode
              }).join(', ')}
            </p>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              className="ui-button-primary"
              onClick={handlePositionsSubmit}
              disabled={updatePositionsMutation.isPending}
            >
              {updatePositionsMutation.isPending ? 'Guardando...' : 'Guardar posiciones'}
            </button>
          </div>
        </div>
      </ResponsiveSection>
    </div>
  )
}