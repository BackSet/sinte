import type { SVGProps } from 'react'

type IconName =
  | 'dashboard'
  | 'users'
  | 'roles'
  | 'matches'
  | 'series'
  | 'groups'
  | 'attendance'
  | 'notifications'
  | 'admin'
  | 'more'
  | 'logout'
  | 'calendar'
  | 'clock'
  | 'search'
  | 'user-plus'
  | 'check'
  | 'x'
  | 'alert'
  | 'eye'
  | 'eye-off'
  | 'configs'
  | 'trash'

type IconSize = 'sm' | 'md' | 'lg'

type IconProps = {
  name: IconName
  size?: IconSize
  className?: string
}

const sizeMap: Record<IconSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
}

function IconPath({ name, ...props }: { name: IconName } & SVGProps<SVGPathElement>) {
  if (name === 'dashboard') {
    return <path {...props} d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v11h-7zM4 13h7v8H4z" />
  }
  if (name === 'users') {
    return <path {...props} d="M7 11a3 3 0 1 0 0-6a3 3 0 0 0 0 6zm10 0a3 3 0 1 0 0-6a3 3 0 0 0 0 6zM2.5 19a4.5 4.5 0 0 1 9 0m1 0a4.5 4.5 0 0 1 9 0" />
  }
  if (name === 'roles') {
    return <path {...props} d="M12 3l8 4v5c0 5-3.4 8-8 9c-4.6-1-8-4-8-9V7l8-4zM9 11l2 2l4-4" />
  }
  if (name === 'matches') {
    return <path {...props} d="M4 7h16M7 4v6M17 4v6M5 11h14v8H5zM9 15h2m2 0h2" />
  }
  if (name === 'series') {
    return <path {...props} d="M4 7h12a4 4 0 1 1 0 8H8m8-8l-2-2m2 2l-2 2M8 15l2 2m-2-2l2-2" />
  }
  if (name === 'groups') {
    return <path {...props} d="M4 8h16M4 12h10M4 16h16M17 10l3 2l-3 2" />
  }
  if (name === 'attendance') {
    return <path {...props} d="M4 12l4 4L20 6" />
  }
  if (name === 'notifications') {
    return <path {...props} d="M12 4a5 5 0 0 1 5 5v3l2 3H5l2-3V9a5 5 0 0 1 5-5zm-2 14a2 2 0 1 0 4 0" />
  }
  if (name === 'admin') {
    return <path {...props} d="M12 3l2.2 2.3l3.1-.5l1.4 2.8l2.9 1.2l-.6 3l2 2l-2 2l.6 3l-2.9 1.2l-1.4 2.8l-3.1-.5L12 21l-2.2 2.3l-3.1.5l-1.4-2.8L2.4 19l.6-3l-2-2l2-2l-.6-3l2.9-1.2l1.4-2.8l3.1.5L12 3zM9 12l2 2l4-4" />
  }
  if (name === 'logout') {
    return <path {...props} d="M9 4H5v16h4M14 8l4 4l-4 4M18 12H9" />
  }
  if (name === 'more') {
    return <path {...props} d="M5 12h.01M12 12h.01M19 12h.01" />
  }
  if (name === 'calendar') {
    return <path {...props} d="M4 7h16M7 4v6M17 4v6M5 11h14v9H5z" />
  }
  if (name === 'clock') {
    return <path {...props} d="M12 7v5l3 2M20 12a8 8 0 1 1-16 0a8 8 0 0 1 16 0z" />
  }
  if (name === 'search') {
    return <path {...props} d="M10 17a7 7 0 1 0 0-14a7 7 0 0 0 0 14zm4.5 3.5L18 21l-3.5-4.5z" />
  }
  if (name === 'user-plus') {
    return <path {...props} d="M15 8a3 3 0 1 0-6 0a3 3 0 0 0 6 0zm-8 9a4 4 0 0 1 8 0M19 8v6m3-3h-6" />
  }
  if (name === 'check') {
    return <path {...props} d="M4 12l5 5L20 7" />
  }
  if (name === 'x') {
    return <path {...props} d="M6 6l12 12M18 6L6 18" />
  }
  if (name === 'alert') {
    return <path {...props} d="M12 3L2 20h20L12 3zm0 5v5m0 2h.01" />
  }
  if (name === 'eye') {
    return <path {...props} d="M1 12s4-8 11-8s11 8 11 8s-4 8-11 8s-11-8-11-8zm11-5a5 5 0 1 0 0 10a5 5 0 0 0 0-10z" />
  }
  if (name === 'eye-off') {
    return <path {...props} d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" />
  }
  if (name === 'configs') {
    return <path {...props} d="M12 15a3 3 0 1 0 0-6a3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33a1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  }
  if (name === 'trash') {
    return <path {...props} d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6m4-6v6" />
  }
  return <path {...props} d="M5 12h14M12 5v14M4 4h16v16H4z" />
}

export function Icon({ name, size = 'md', className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`ui-icon ${sizeMap[size]} ${className ?? ''}`.trim()}
      aria-hidden="true"
    >
      <IconPath name={name} />
    </svg>
  )
}