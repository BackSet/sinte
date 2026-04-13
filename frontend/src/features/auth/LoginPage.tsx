import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { login } from './auth-api'
import { useAuthStore } from '../../store/auth-store'
import { getApiErrorMessage } from '../../lib/api-client'

export function LoginPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')

  const mutation = useMutation({
    mutationFn: login,
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
    mutation.mutate({ identifier, password })
  }

  return (
    <div className="ui-card mx-auto w-full max-w-md p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Iniciar sesion</h1>
      <p className="ui-text-muted mt-2 text-sm">Accede al dashboard del sistema.</p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="login-identifier">Correo o codigo jugador</label>
          <input
            id="login-identifier"
            className="ui-input"
            type="text"
            placeholder="correo@dominio.com o backset#TAKE"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="login-password">Contrasena</label>
          <input
            id="login-password"
            className="ui-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {mutation.isError && (
          <p className="text-sm text-red-600">{getApiErrorMessage(mutation.error, 'No se pudo iniciar sesion. Verifica tus credenciales.')}</p>
        )}
        {mutation.isSuccess && <p className="text-sm text-emerald-600">Sesion iniciada. Redirigiendo...</p>}
        <button
          className="ui-button w-full"
          type="submit"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>

      <p className="ui-text-muted mt-4 text-sm">
        No tienes cuenta?{' '}
        <Link className="font-medium underline" to="/register">
          Registrate
        </Link>
      </p>
    </div>
  )
}
