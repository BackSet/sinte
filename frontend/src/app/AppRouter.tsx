import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { AuthLayout } from '../layouts/AuthLayout'
import { DashboardLayout } from '../layouts/DashboardLayout'
import { RequireAuth } from '../components/RequireAuth'
import { RequireRole } from '../components/RequireRole'
import { LoginPage } from '../features/auth/LoginPage'
import { RegisterPage } from '../features/auth/RegisterPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { UsersPage } from '../features/users/UsersPage'
import { RolesPage } from '../features/roles/RolesPage'
import { MatchesPage } from '../features/matches/MatchesPage'
import { SeriesPage } from '../features/series/SeriesPage'
import { AttendancePage } from '../features/attendance/AttendancePage'
import { NotificationsPage } from '../features/notifications/NotificationsPage'
import { AdminEmailQueuePage } from '../features/admin/AdminEmailQueuePage'
import { GroupsPage } from '../features/groups/GroupsPage'
import { MyGroupsPage } from '../features/groups/MyGroupsPage'
import { ConfigsPage } from '../features/configs/ConfigsPage'
import { ProfilePage } from '../features/profile/ProfilePage'

const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: '/', element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: <DashboardPage /> },
          {
            element: <RequireRole allowed={['ADMIN']} />,
            children: [
              { path: '/users', element: <UsersPage /> },
              { path: '/roles', element: <RolesPage /> },
            ],
          },
          { path: '/matches', element: <MatchesPage /> },
          { path: '/my-groups', element: <MyGroupsPage /> },
          {
            element: <RequireRole allowed={['DT', 'ADMIN']} />,
            children: [
              { path: '/series', element: <SeriesPage /> },
              { path: '/groups', element: <GroupsPage /> },
              { path: '/configs', element: <ConfigsPage /> },
            ],
          },
          { path: '/attendance', element: <AttendancePage /> },
          { path: '/notifications', element: <NotificationsPage /> },
          { path: '/profile', element: <ProfilePage /> },
          {
            element: <RequireRole allowed={['ADMIN']} />,
            children: [{ path: '/admin/email-queue', element: <AdminEmailQueuePage /> }],
          },
          { path: '*', element: <Navigate to="/dashboard" replace /> },
        ],
      },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
