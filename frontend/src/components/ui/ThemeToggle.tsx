import { useThemeStore } from '../../store/theme-store'

const modes = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'system', label: 'Sistema' },
] as const

export function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode)
  const setMode = useThemeStore((s) => s.setMode)

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border px-1 py-1 ui-card">
      {modes.map((item) => (
        <button
          key={item.value}
          type="button"
          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
            mode === item.value ? 'ui-nav-link-active' : 'ui-text-muted'
          }`}
          onClick={() => setMode(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
