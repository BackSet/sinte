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
    <div className="inline-flex items-center gap-1 rounded-lg border bg-[var(--bg-muted)] p-1">
      {modes.map((item) => (
        <button
          key={item.value}
          type="button"
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
            mode === item.value ? 'bg-[var(--bg-panel)] text-[var(--text-primary)] shadow-sm' : 'ui-text-muted'
          }`}
          onClick={() => setMode(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
