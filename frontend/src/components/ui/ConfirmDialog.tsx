import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  const handleCancel = () => {
    dialogRef.current?.close()
    onCancel()
  }

  const handleConfirm = () => {
    dialogRef.current?.close()
    onConfirm()
  }

  return (
    <dialog ref={dialogRef} className="ui-dialog" onClose={handleCancel}>
      <div className="ui-dialog-content">
        <div className="mb-3 flex items-center gap-2">
          {variant === 'danger' && (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--danger)]/10 text-[var(--danger)]">
              <Icon name="alert" size="sm" />
            </span>
          )}
          <h3 className="text-base font-semibold">{title}</h3>
        </div>
        <p className="ui-text-muted text-sm">{description}</p>
        <div className="ui-dialog-actions">
          <button className="ui-button-muted" onClick={handleCancel}>
            {cancelLabel}
          </button>
          <button
            className={variant === 'danger' ? 'ui-button ui-button-danger' : 'ui-button'}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}

type UseConfirmDialogReturn = {
  ConfirmDialogComponent: ReactNode
  requestConfirm: (options: Omit<ConfirmDialogProps, 'open' | 'onConfirm' | 'onCancel'>) => Promise<boolean>
}

export function useConfirmDialog(): UseConfirmDialogReturn {
  const [state, setState] = useState<{
    open: boolean
    options: Omit<ConfirmDialogProps, 'open' | 'onConfirm' | 'onCancel'> | null
    resolve: ((value: boolean) => void) | null
  }>({ open: false, options: null, resolve: null })

  const requestConfirm = (
    options: Omit<ConfirmDialogProps, 'open' | 'onConfirm' | 'onCancel'>,
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ open: true, options, resolve })
    })
  }

  const handleConfirm = () => {
    state.resolve?.(true)
    setState((prev) => ({ ...prev, open: false }))
  }

  const handleCancel = () => {
    state.resolve?.(false)
    setState((prev) => ({ ...prev, open: false }))
  }

  const ConfirmDialogComponent = state.options ? (
    <ConfirmDialog
      open={state.open}
      title={state.options.title}
      description={state.options.description}
      confirmLabel={state.options.confirmLabel}
      cancelLabel={state.options.cancelLabel}
      variant={state.options.variant}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null

  return { ConfirmDialogComponent, requestConfirm }
}