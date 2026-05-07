import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'

type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

type ModalProps = {
  open: boolean
  onClose: () => void
  size?: ModalSize
  title: string
  subtitle?: string
  children: ReactNode
  tabs?: Array<{ label: string; active: boolean; onClick: () => void }>
}

export function Modal({ open, onClose, size = 'md', title, subtitle, children, tabs }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose()
    }
  }

  return (
    <div
      ref={overlayRef}
      className="ui-modal-backdrop flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className={`ui-modal ui-modal--${size}`}>
        <div className="ui-modal-header">
          <div>
            <p className="ui-modal-title">{title}</p>
            {subtitle && <p className="ui-modal-subtitle">{subtitle}</p>}
          </div>
          <button className="ui-modal-close" onClick={onClose} aria-label="Cerrar">
            <Icon name="x" size="sm" />
          </button>
        </div>

        {tabs && (
          <div className="ui-modal-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.label}
                className={`ui-modal-tab ${tab.active ? 'active' : ''}`}
                onClick={tab.onClick}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <div className="ui-modal-body">{children}</div>
      </div>
    </div>
  )
}

type ModalFooterProps = {
  children: ReactNode
}

export function ModalFooter({ children }: ModalFooterProps) {
  return <div className="ui-modal-footer">{children}</div>
}

Modal.Footer = ModalFooter
