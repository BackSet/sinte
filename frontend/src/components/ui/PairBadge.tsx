import { useEffect, useState } from 'react'
import { PLAYER_POSITION_OPTIONS } from '../../lib/player-positions'
import { Icon } from './Icon'

const POSITION_COLORS: Record<string, string> = {
  GOALKEEPER: '#3B82F6',
  CENTER_BACK: '#10B981',
  LEFT_BACK: '#059669',
  RIGHT_BACK: '#047857',
  DEFENSIVE_MIDFIELDER: '#F59E0B',
  CENTRAL_MIDFIELDER: '#D97706',
  ATTACKING_MIDFIELDER: '#EF4444',
  LEFT_WINGER: '#8B5CF6',
  RIGHT_WINGER: '#7C3AED',
  STRIKER: '#EC4899',
}

const POSITION_COLORS_DARK: Record<string, string> = {
  GOALKEEPER: '#60A5FA',
  CENTER_BACK: '#34D399',
  LEFT_BACK: '#34D399',
  RIGHT_BACK: '#34D399',
  DEFENSIVE_MIDFIELDER: '#FBBF24',
  CENTRAL_MIDFIELDER: '#FBBF24',
  ATTACKING_MIDFIELDER: '#F87171',
  LEFT_WINGER: '#A78BFA',
  RIGHT_WINGER: '#A78BFA',
  STRIKER: '#F472B6',
}

const POSITION_LABELS: Record<string, string> = Object.fromEntries(
  PLAYER_POSITION_OPTIONS.map((opt) => [opt.value, opt.label]),
)

export type PairBadgeProps = {
  playerA: { fullName: string; playerHandle?: string | null }
  playerB: { fullName: string; playerHandle?: string | null }
  positionCode: string
  pairNumber?: number
  onDelete?: () => void
}

export function PairBadge({ playerA, playerB, positionCode, pairNumber, onDelete }: PairBadgeProps) {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const colors = isDark ? POSITION_COLORS_DARK : POSITION_COLORS
  const color = colors[positionCode] ?? (isDark ? '#9CA3AF' : '#6B7280')
  const positionLabel = POSITION_LABELS[positionCode] ?? positionCode

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color }}>
          {positionLabel}
        </span>
        <div className="flex items-center gap-2">
          {pairNumber !== undefined && (
            <span className="ui-text-muted text-xs">#{pairNumber}</span>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="ui-icon-btn ui-icon-btn-danger"
              title="Eliminar pareja"
            >
              <Icon name="trash" size="sm" />
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <PlayerPill name={playerA.fullName} handle={playerA.playerHandle} />
        <span className="text-xs ui-text-muted">+</span>
        <PlayerPill name={playerB.fullName} handle={playerB.playerHandle} />
      </div>
    </div>
  )
}

function PlayerPill({ name, handle }: { name: string; handle?: string | null }) {
  return (
    <div className="flex flex-col">
      <span className="text-sm font-medium">{name}</span>
      {handle && <span className="ui-text-muted text-xs">{handle}</span>}
    </div>
  )
}