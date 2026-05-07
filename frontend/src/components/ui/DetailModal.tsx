import type { ReactNode } from 'react'
import { Modal } from './Modal'

type DetailModalProps = {
  open: boolean
  onClose: () => void
  size?: 'sm' | 'md' | 'lg' | 'xl'
  title: string
  subtitle?: string
  children: ReactNode
}

export function DetailModal({ open, onClose, size = 'md', title, subtitle, children }: DetailModalProps) {
  return (
    <Modal open={open} onClose={onClose} size={size} title={title} subtitle={subtitle}>
      {children}
    </Modal>
  )
}

type InfoRowProps = {
  label: string
  value: ReactNode
}

export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="ui-info-row">
      <span className="ui-info-label">{label}</span>
      <span className="ui-info-value">{value}</span>
    </div>
  )
}

type DetailSectionProps = {
  title: string
  children: ReactNode
}

export function DetailSection({ title, children }: DetailSectionProps) {
  return (
    <div className="ui-detail-section">
      <p className="ui-detail-section-title">{title}</p>
      {children}
    </div>
  )
}

type DetailDividerProps = {}

export function DetailDivider({}: DetailDividerProps) {
  return <hr className="ui-section-divider" />
}

DetailModal.InfoRow = InfoRow
DetailModal.Section = DetailSection
DetailModal.Divider = DetailDivider
