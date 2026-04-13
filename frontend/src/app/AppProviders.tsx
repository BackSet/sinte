import { useEffect } from 'react'
import type { PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getMe } from '../features/auth/auth-api'
import { useAuthStore } from '../store/auth-store'
import { useThemeStore } from '../store/theme-store'

const queryClient = new QueryClient()

export function AppProviders({ children }: PropsWithChildren) {
  const hydrate = useAuthStore((s) => s.hydrate)
  const accessToken = useAuthStore((s) => s.accessToken)
  const refreshToken = useAuthStore((s) => s.refreshToken)
  const setSession = useAuthStore((s) => s.setSession)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const mode = useThemeStore((s) => s.mode)
  const hydrateTheme = useThemeStore((s) => s.hydrateTheme)
  const syncWithSystem = useThemeStore((s) => s.syncWithSystem)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    hydrateTheme()
  }, [hydrateTheme])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => syncWithSystem()
    mediaQuery.addEventListener('change', handleChange)
    if (mode === 'system') {
      syncWithSystem()
    }
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [mode, syncWithSystem])

  useEffect(() => {
    if (!accessToken || !refreshToken) return
    getMe()
      .then((user) => {
        setSession({ accessToken, refreshToken, user })
      })
      .catch(() => clearAuth())
  }, [accessToken, refreshToken, setSession, clearAuth])

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
