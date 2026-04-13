import { create } from 'zustand'
import { clearSession, readSession, writeSession } from '../lib/session'
import type { PlayerPosition } from '../lib/player-positions'

export type AuthUser = {
  userId: string
  email: string
  fullName: string
  phone?: string
  nickname?: string
  nicknameTag?: string
  playerHandle?: string
  primaryPosition?: PlayerPosition
  secondaryPosition?: PlayerPosition
  roles: string[]
}

type AuthState = {
  accessToken: string | null
  refreshToken: string | null
  user: AuthUser | null
  hydrated: boolean
  setSession: (payload: { accessToken: string; refreshToken: string; user: AuthUser }) => void
  clearAuth: () => void
  hydrate: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  hydrated: false,
  setSession: ({ accessToken, refreshToken, user }) => {
    writeSession({ accessToken, refreshToken })
    set({ accessToken, refreshToken, user })
  },
  clearAuth: () => {
    clearSession()
    set({ accessToken: null, refreshToken: null, user: null })
  },
  hydrate: () => {
    const session = readSession()
    set({
      accessToken: session?.accessToken ?? null,
      refreshToken: session?.refreshToken ?? null,
      hydrated: true,
    })
  },
}))
