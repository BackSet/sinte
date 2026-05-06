import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { register } from './auth-api'
import { useAuthStore } from '../../store/auth-store'
import { PLAYER_POSITION_OPTIONS } from '../../lib/player-positions'
import type { PlayerPosition } from '../../lib/player-positions'
import { getApiErrorMessage } from '../../lib/api-client'

export function RegisterPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [nickname, setNickname] = useState('')
  const [primaryPosition, setPrimaryPosition] = useState<PlayerPosition>('CENTRAL_MIDFIELDER')
  const [secondaryPosition, setSecondaryPosition] = useState<string>('')
  const [password, setPassword] = useState('')

  const mutation = useMutation({
    mutationFn: register,
    onSuccess: (data) => {
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
          primaryPosition: data.primaryPosition,
          secondaryPosition: data.secondaryPosition,
          roles: data.roles,
        },
      })
      navigate('/dashboard', { replace: true })
    },
  })

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (secondaryPosition && secondaryPosition === primaryPosition) {
      return
    }
    mutation.mutate({
      fullName,
      email,
      phone,
      nickname,
      primaryPosition,
      secondaryPosition: secondaryPosition ? (secondaryPosition as PlayerPosition) : undefined,
      password,
    })
  }

  return (
    <div className="ui-card mx-auto w-full max-w-2xl p-6 sm:p-8">
      <span className="ui-badge ui-badge-info">Nuevo jugador</span>
      <h1 className="mt-4 text-2xl font-semibold">Crear cuenta</h1>
      <p className="ui-text-muted mt-2 text-sm">Registro de usuario para el sistema.</p>

      <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium" htmlFor="register-full-name">Nombre completo</label>
          <input
            id="register-full-name"
            className="ui-input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="register-email">Correo</label>
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
          <label className="mb-1 block text-sm font-medium" htmlFor="register-phone">Telefono</label>
          <input
            id="register-phone"
            className="ui-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="register-nickname">Apodo (opcional)</label>
          <input
            id="register-nickname"
            className="ui-input"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="register-primary-position">Posicion principal</label>
          <select id="register-primary-position" className="ui-input" value={primaryPosition} onChange={(e) => setPrimaryPosition(e.target.value as PlayerPosition)} required>
            {PLAYER_POSITION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="register-secondary-position">Posicion secundaria (opcional)</label>
          <select id="register-secondary-position" className="ui-input" value={secondaryPosition} onChange={(e) => setSecondaryPosition(e.target.value)}>
            <option value="">Sin secundaria</option>
            {PLAYER_POSITION_OPTIONS.filter((option) => option.value !== primaryPosition).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="register-password">Contrasena</label>
          <input
            id="register-password"
            className="ui-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {secondaryPosition && secondaryPosition === primaryPosition && (
          <p className="md:col-span-2 text-sm text-red-600">
            La posicion secundaria debe ser distinta a la principal.
          </p>
        )}
        {mutation.isError && (
          <p className="md:col-span-2 text-sm text-red-600">
            {getApiErrorMessage(mutation.error, 'No se pudo completar el registro.')}
          </p>
        )}
        <div className="md:col-span-2">
          <button
            className="ui-button w-full"
            type="submit"
            disabled={mutation.isPending || secondaryPosition === primaryPosition}
          >
            {mutation.isPending ? (
              <span className="inline-flex items-center justify-center gap-2"><span className="ui-loader" /> Creando cuenta...</span>
            ) : 'Registrarme'}
          </button>
        </div>
      </form>

      <p className="ui-text-muted mt-4 text-sm">
        Ya tienes cuenta?{' '}
        <Link className="font-medium text-[var(--accent)] underline" to="/login">
          Ir a login
        </Link>
      </p>
    </div>
  )
}
