export type TeamCardProps = {
  teamNumber: 1 | 2
  name: string
  players: Array<{
    fullName: string
    playerHandle?: string | null
    primaryPositionCode: string
  }>
  pairIds?: string[]
}

const TEAM_STYLES = {
  1: {
    border: 'var(--color-primary)',
    bg: 'rgba(12, 68, 124, 0.08)',
    label: 'Equipo A',
  },
  2: {
    border: '#712B13',
    bg: 'rgba(113, 43, 19, 0.08)',
    label: 'Equipo B',
  },
}

export function TeamCard({ teamNumber, name, players }: TeamCardProps) {
  const style = TEAM_STYLES[teamNumber]

  return (
    <div
      className="rounded-lg border p-4"
      style={{ borderColor: style.border, backgroundColor: style.bg }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <span
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: style.border }}
          >
            {style.label}
          </span>
          <h4 className="font-semibold">{name}</h4>
        </div>
        <span className="ui-text-muted text-xs">{players.length} jugadores</span>
      </div>
      <div className="space-y-1">
        {players.map((player, i) => (
          <div key={i} className="flex items-center justify-between rounded-md bg-white px-3 py-1.5">
            <span className="text-sm">{player.fullName}</span>
            <span className="flex items-center gap-2">
              {player.playerHandle && (
                <span className="ui-text-muted text-xs">{player.playerHandle}</span>
              )}
              <span className="rounded border px-1.5 py-0.5 text-xs">{player.primaryPositionCode}</span>
            </span>
          </div>
        ))}
        {players.length === 0 && (
          <p className="ui-text-muted py-2 text-center text-sm">Sin jugadores asignados</p>
        )}
      </div>
    </div>
  )
}