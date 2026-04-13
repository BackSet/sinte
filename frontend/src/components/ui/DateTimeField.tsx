import { useRef } from 'react'
import type { InputHTMLAttributes } from 'react'
import { Icon } from './Icon'

type DateTimeType = 'date' | 'time' | 'datetime-local'

type DateTimeFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  type: DateTimeType
}

export function DateTimeField({ className, type, ...props }: DateTimeFieldProps) {
  const iconName = type === 'time' ? 'clock' : 'calendar'
  const pickerLabel =
    type === 'time'
      ? 'Abrir selector de hora'
      : type === 'date'
        ? 'Abrir selector de fecha'
        : 'Abrir selector de fecha y hora'
  const inputRef = useRef<HTMLInputElement>(null)

  const openNativePicker = () => {
    const input = inputRef.current
    if (!input) return

    input.focus()
    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker()
        return
      } catch {
        // Continue with fallback click for browsers with restricted showPicker behavior.
      }
    }
    input.click()
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        {...props}
        type={type}
        className={`ui-input ui-datetime-input pr-11 ${className ?? ''}`.trim()}
      />
      <button
        type="button"
        className="ui-datetime-icon absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md"
        onClick={openNativePicker}
        aria-label={pickerLabel}
      >
        <Icon name={iconName} size="sm" />
      </button>
    </div>
  )
}
