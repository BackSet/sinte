export type PairingStatusBarProps = {
  confirmedCount: number
  targetPlayers: number | null
  pairsCount: number
  cupReached: boolean
}

export function PairingStatusBar({ confirmedCount, targetPlayers, pairsCount, cupReached }: PairingStatusBarProps) {
  const cap = targetPlayers ?? confirmedCount
  const progress = cap > 0 ? Math.min((confirmedCount / cap) * 100, 100) : 0

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium">Estado de la convocatoria</span>
        <span className={`text-xs font-medium ${cupReached ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>
          {cupReached ? 'Cupo completo' : 'Esperando mas confirmaciones'}
        </span>
      </div>
      <div className="mb-1.5 flex h-2 overflow-hidden rounded-full bg-[var(--border-soft)]">
        <div
          className={`h-full transition-all ${cupReached ? 'bg-[var(--success)]' : 'bg-[var(--warning)]'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs ui-text-muted">
        <span>
          {confirmedCount} / {cap ?? '-'} jugadores confirmados
        </span>
        <span>{pairsCount} parejas formadas</span>
      </div>
    </div>
  )
}