import { useToastStore } from '../../store/toast-store'
import { Icon } from './Icon'

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const removeToast = useToastStore((s) => s.removeToast)

  if (!toasts.length) return null

  return (
    <div className="fixed right-3 top-3 z-50 flex flex-col gap-2 sm:right-4 sm:top-4" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`ui-toast ui-toast-${toast.type}`}
          role="alert"
        >
          <div className="ui-toast-icon">
            <Icon
              name={toast.type === 'success' ? 'check' : toast.type === 'error' ? 'x' : 'notifications'}
              size="sm"
            />
          </div>
          <p className="ui-toast-message">{toast.message}</p>
          <button
            className="ui-toast-close"
            onClick={() => removeToast(toast.id)}
            aria-label="Cerrar notificacion"
          >
            <Icon name="x" size="sm" />
          </button>
        </div>
      ))}
    </div>
  )
}