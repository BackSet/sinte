import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { register } from './auth-api'
import { useAuthStore } from '../../store/auth-store'
import { useToastStore } from '../../store/toast-store'
import { getApiErrorMessage } from '../../lib/api-client'
import { Icon } from '../../components/ui/Icon'
import { PLAYER_POSITION_OPTIONS, type PlayerPosition } from '../../lib/player-positions'

export function RegisterPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const addToast = useToastStore((s) => s.addToast)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [nickname, setNickname] = useState('')
  const [tag, setTag] = useState('')
  const [shirtNumber, setShirtNumber] = useState(0)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [selectedPositions, setSelectedPositions] = useState<Array<{ positionCode: string; priority: number }>>([])

  const mutation = useMutation({
    mutationFn: register,
    onSuccess: (data) => {
      addToast('success', 'Cuenta creada correctamente')
      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: {
          userId: data.userId,
          email: data.email,
          fullName: data.fullName,
          nickname: data.nickname,
          nicknameTag: data.nicknameTag,
          playerHandle: data.playerHandle,
          roles: data.roles,
        },
      })
      navigate('/dashboard', { replace: true })
    },
  })

  function togglePosition(code: PlayerPosition) {
    setSelectedPositions((prev) => {
      const exists = prev.find((p) => p.positionCode === code)
      if (exists) {
        return prev.filter((p) => p.positionCode !== code)
      }
      return [...prev, { positionCode: code, priority: prev.length + 1 }]
    })
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    mutation.mutate({
      fullName,
      email,
      phone,
      nickname: nickname || undefined,
      tag,
      shirtNumber,
      password,
      positions: selectedPositions.length > 0 ? selectedPositions : undefined,
    })
  }

  return (
    <div className="ui-card p-6 sm:p-8">
      <h2 className="text-xl font-semibold tracking-tight">Crear cuenta</h2>
      <p className="ui-text-muted mt-1 text-sm">Registro de usuario para el sistema</p>

      <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
        <div className="md:col-span-2">
          <label className="mb-1.5 block text-sm font-medium" htmlFor="register-full-name">Nombre completo</label>
          <input
            id="register-full-name"
            className="ui-input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="register-email">Correo</label>
          <input
            id="register-email"
            className="ui-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="register-phone">Telefono</label>
          <input
            id="register-phone"
            className="ui-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="register-nickname">Apodo (opcional)</label>
          <input
            id="register-nickname"
            className="ui-input"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={80}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="register-tag">Tag (4-10 caracteres)</label>
          <input
            id="register-tag"
            className="ui-input"
            value={tag}
            onChange={(e) => setTag(e.target.value.toUpperCase())}
            maxLength={10}
            placeholder="Ej: MITEAM123"
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="register-shirt">Numero de camiseta</label>
          <input
            id="register-shirt"
            className="ui-input"
            type="number"
            value={shirtNumber}
            onChange={(e) => setShirtNumber(parseInt(e.target.value) || 0)}
            min={0}
            max={99}
            required
          />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1.5 block text-sm font-medium" htmlFor="register-password">Contrasena</label>
          <div className="relative">
            <input
              id="register-password"
              className="ui-input pr-10"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
              tabIndex={-1}
            >
              <Icon name={showPassword ? 'eye-off' : 'eye'} size="sm" />
            </button>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="mb-1.5 block text-sm font-medium">Posiciones</label>
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
            <p className="ui-text-muted mt-1.5 text-xs">
              Seleccionadas: {selectedPositions.map((p) => {
                const opt = PLAYER_POSITION_OPTIONS.find((o) => o.value === p.positionCode)
                return opt?.label ?? p.positionCode
              }).join(', ')}
            </p>
          )}
        </div>

        {mutation.isError && (
          <div className="md:col-span-2 rounded-lg border border-[var(--danger)]/20 bg-[var(--danger)]/5 px-3 py-2 text-sm text-[var(--danger)]">
            {getApiErrorMessage(mutation.error, 'No se pudo completar el registro.')}
          </div>
        )}
        <div className="md:col-span-2">
          <button
            className="ui-button w-full"
            type="submit"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Creando cuenta...' : 'Registrarme'}
          </button>
        </div>
      </form>

      <p className="ui-text-muted mt-5 text-center text-sm">
        Ya tienes cuenta?{' '}
        <Link className="font-medium underline underline-offset-2 hover:no-underline" to="/login">
          Ir a login
        </Link>
      </p>
    </div>
  )
}