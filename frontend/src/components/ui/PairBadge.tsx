import { PLAYER_POSITION_OPTIONS } from '../../lib/player-positions'

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

const POSITION_LABELS: Record<string, string> = Object.fromEntries(
  PLAYER_POSITION_OPTIONS.map((opt) => [opt.value, opt.label]),
)

export type PairBadgeProps = {
  playerA: { fullName: string; playerHandle?: string | null }
  playerB: { fullName: string; playerHandle?: string | null }
  positionCode: string
  pairNumber?: number
}

export function PairBadge({ playerA, playerB, positionCode, pairNumber }: PairBadgeProps) {
  const color = POSITION_COLORS[positionCode] ?? '#6B7280'
  const positionLabel = POSITION_LABELS[positionCode] ?? positionCode

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color }}>
          {positionLabel}
        </span>
        {pairNumber !== undefined && (
          <span className="ui-text-muted text-xs">#{pairNumber}</span>
        )}
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