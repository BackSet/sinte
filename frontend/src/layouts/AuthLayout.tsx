import { Outlet } from 'react-router-dom'
import { ThemeToggle } from '../components/ui/ThemeToggle'

export function AuthLayout() {
  return (
    <main className="min-h-screen bg-[var(--bg-app)] px-4 py-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between pb-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-bold text-[var(--accent-contrast)]">
            ST
          </span>
          <div>
            <p className="font-semibold">SINTE</p>
            <p className="ui-text-muted text-xs">Reservas y convocatorias</p>
          </div>
        </div>
        <ThemeToggle />
      </div>
      <Outlet />
    </main>
  )
}
