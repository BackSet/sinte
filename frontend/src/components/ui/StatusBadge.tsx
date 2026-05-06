type StatusBadgeTone = 'success' | 'warning' | 'info' | 'danger' | 'neutral'

type StatusBadgeProps = {
  label: string
  tone?: StatusBadgeTone
}

const toneClass: Record<StatusBadgeTone, string> = {
  success: 'ui-badge-success',
  warning: 'ui-badge-warning',
  info: 'ui-badge-info',
  danger: 'ui-badge-danger',
  neutral: '',
}

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  return <span className={`ui-badge ${toneClass[tone]}`.trim()}>{label}</span>
}
