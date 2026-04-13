import axios, { AxiosError } from 'axios'
import { useAuthStore } from '../store/auth-store'
import type { PlayerPosition } from './player-positions'

type RefreshResponse = {
  userId: string
  email: string
  fullName: string
  nickname?: string
  nicknameTag?: string
  playerHandle?: string
  primaryPosition?: PlayerPosition
  secondaryPosition?: PlayerPosition
  roles: string[]
  accessToken: string
  refreshToken: string
}

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

export const apiClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

type ApiErrorPayload = {
  message?: string
  error?: string
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const payload = error.response?.data as ApiErrorPayload | undefined
    const message = payload?.message ?? payload?.error
    if (message && message.trim()) {
      return message
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  return fallback
}

let refreshingPromise: Promise<RefreshResponse> | null = null

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined
    const status = error.response?.status
    const pathname = originalRequest?.url ?? ''
    const isAuthEndpoint = pathname.includes('/api/v1/auth/login') || pathname.includes('/api/v1/auth/register') || pathname.includes('/api/v1/auth/refresh')

    if (status !== 401 || !originalRequest || originalRequest._retry || isAuthEndpoint) {
      throw error
    }

    originalRequest._retry = true
    const { refreshToken, clearAuth, setSession, user } = useAuthStore.getState()
    if (!refreshToken || !user) {
      clearAuth()
      throw error
    }

    if (!refreshingPromise) {
      refreshingPromise = axios
        .post<RefreshResponse>(`${baseURL}/api/v1/auth/refresh`, { refreshToken })
        .then((res) => res.data)
        .finally(() => {
          refreshingPromise = null
        })
    }

    try {
      const refreshed = await refreshingPromise
      setSession({
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        user: {
          userId: refreshed.userId,
          email: refreshed.email,
          fullName: refreshed.fullName,
          nickname: refreshed.nickname,
          nicknameTag: refreshed.nicknameTag,
          playerHandle: refreshed.playerHandle,
          primaryPosition: refreshed.primaryPosition,
          secondaryPosition: refreshed.secondaryPosition,
          roles: refreshed.roles,
        },
      })

      originalRequest.headers = originalRequest.headers ?? {}
      originalRequest.headers.Authorization = `Bearer ${refreshed.accessToken}`
      return apiClient.request(originalRequest)
    } catch (refreshError) {
      clearAuth()
      throw refreshError
    }
  },
)
