export type PlayerPosition =
  | 'GOALKEEPER'
  | 'CENTER_BACK'
  | 'LEFT_BACK'
  | 'RIGHT_BACK'
  | 'DEFENSIVE_MIDFIELDER'
  | 'CENTRAL_MIDFIELDER'
  | 'ATTACKING_MIDFIELDER'
  | 'LEFT_WINGER'
  | 'RIGHT_WINGER'
  | 'STRIKER'

export const PLAYER_POSITION_OPTIONS: Array<{ value: PlayerPosition; label: string }> = [
  { value: 'GOALKEEPER', label: 'Portero' },
  { value: 'CENTER_BACK', label: 'Defensa central' },
  { value: 'LEFT_BACK', label: 'Lateral izquierdo' },
  { value: 'RIGHT_BACK', label: 'Lateral derecho' },
  { value: 'DEFENSIVE_MIDFIELDER', label: 'Mediocentro defensivo' },
  { value: 'CENTRAL_MIDFIELDER', label: 'Mediocentro' },
  { value: 'ATTACKING_MIDFIELDER', label: 'Mediapunta' },
  { value: 'LEFT_WINGER', label: 'Extremo izquierdo' },
  { value: 'RIGHT_WINGER', label: 'Extremo derecho' },
  { value: 'STRIKER', label: 'Delantero' },
]
