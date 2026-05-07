import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { login } from './auth-api'
import { useAuthStore } from '../../store/auth-store'
import { useToastStore } from '../../store/toast-store'
import { getApiErrorMessage } from '../../lib/api-client'
import { Icon } from '../../components/ui/Icon'

export function LoginPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const addToast = useToastStore((s) => s.addToast)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      addToast('success', 'Sesion iniciada correctamente')
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

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    mutation.mutate({ identifier, password })
  }

  return (
    <div className="ui-card p-6 sm:p-8">
      <h2 className="text-xl font-semibold tracking-tight">Iniciar sesion</h2>
      <p className="ui-text-muted mt-1 text-sm">Accede al dashboard del sistema</p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="login-identifier">
            Correo o codigo jugador
          </label>
          <input
            id="login-identifier"
            className="ui-input"
            type="text"
            placeholder="correo@dominio.com o nick#TAG"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoComplete="username"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="login-password">
            Contrasena
          </label>
          <div className="relative">
            <input
              id="login-password"
              className="ui-input pr-10"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
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
        {mutation.isError && (
          <div className="rounded-lg border border-[var(--danger)]/20 bg-[var(--danger)]/5 px-3 py-2 text-sm text-[var(--danger)]">
            {getApiErrorMessage(mutation.error, 'No se pudo iniciar sesion. Verifica tus credenciales.')}
          </div>
        )}
        <button
          className="ui-button w-full"
          type="submit"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>

      <p className="ui-text-muted mt-5 text-center text-sm">
        No tienes cuenta?{' '}
        <Link className="font-medium underline underline-offset-2 hover:no-underline" to="/register">
          Registrate
        </Link>
      </p>
    </div>
  )
}