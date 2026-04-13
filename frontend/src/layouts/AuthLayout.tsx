import { Outlet } from 'react-router-dom'
import { ThemeToggle } from '../components/ui/ThemeToggle'

export function AuthLayout() {
  return (
    <main className="min-h-screen px-4 py-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-5xl justify-end pb-4">
        <ThemeToggle />
      </div>
      <Outlet />
    </main>
  )
}
