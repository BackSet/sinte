import { apiClient } from '../../lib/api-client'
import type { AuthUser } from '../../store/auth-store'

export type AuthResponse = {
  userId: string
  email: string
  fullName: string
  nickname?: string
  nicknameTag?: string
  playerHandle?: string
  roles: string[]
  accessToken: string
  refreshToken: string
}

export type RegisterPayload = {
  fullName: string
  email: string
  phone: string
  nickname?: string
  password: string
}

export type LoginPayload = {
  identifier: string
  password: string
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/api/v1/auth/login', payload)
  return response.data
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/api/v1/auth/register', payload)
  return response.data
}

export async function getMe(): Promise<AuthUser> {
  const response = await apiClient.get<{
    userId: string
    email: string
    fullName: string
    phone: string
    nickname?: string
    nicknameTag?: string
    playerHandle?: string
    roles: string[]
  }>('/api/v1/auth/me')
  return response.data
}

export async function logout(refreshToken: string): Promise<void> {
  await apiClient.post('/api/v1/auth/logout', { refreshToken })
}
