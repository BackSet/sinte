import { Outlet } from 'react-router-dom'
import { ThemeToggle } from '../components/ui/ThemeToggle'

export function AuthLayout() {
  return (
    <main className="min-h-screen px-4 py-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-5xl justify-end pb-4">
        <ThemeToggle />
      </div>
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">SINTE</h1>
          <p className="ui-text-muted mt-1 text-sm">Gestion deportiva</p>
        </div>
        <Outlet />
      </div>
    </main>
  )
}