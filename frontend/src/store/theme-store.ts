import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark' | 'system'
type EffectiveTheme = 'light' | 'dark'

const STORAGE_KEY = 'sinte.theme.mode'

function getSystemTheme(): EffectiveTheme {
  if (typeof window === 'undefined') {
    return 'light'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveEffectiveTheme(mode: ThemeMode): EffectiveTheme {
  return mode === 'system' ? getSystemTheme() : mode
}

function applyThemeClass(theme: EffectiveTheme) {
  if (typeof document === 'undefined') {
    return
  }
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

function getStoredMode(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'system'
  }
  const rawValue = window.localStorage.getItem(STORAGE_KEY)
  if (rawValue === 'light' || rawValue === 'dark' || rawValue === 'system') {
    return rawValue
  }
  return 'system'
}

export function initializeThemeFromStorage() {
  const mode = getStoredMode()
  applyThemeClass(resolveEffectiveTheme(mode))
}

type ThemeStore = {
  mode: ThemeMode
  effectiveTheme: EffectiveTheme
  hydrateTheme: () => void
  setMode: (mode: ThemeMode) => void
  syncWithSystem: () => void
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  mode: 'system',
  effectiveTheme: 'light',
  hydrateTheme: () => {
    const mode = getStoredMode()
    const effectiveTheme = resolveEffectiveTheme(mode)
    applyThemeClass(effectiveTheme)
    set({ mode, effectiveTheme })
  },
  setMode: (mode) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, mode)
    }
    const effectiveTheme = resolveEffectiveTheme(mode)
    applyThemeClass(effectiveTheme)
    set({ mode, effectiveTheme })
  },
  syncWithSystem: () => {
    const { mode } = get()
    if (mode !== 'system') {
      return
    }
    const effectiveTheme = resolveEffectiveTheme('system')
    applyThemeClass(effectiveTheme)
    set({ effectiveTheme })
  },
}))
