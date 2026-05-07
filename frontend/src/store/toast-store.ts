import { create } from 'zustand'

type ToastType = 'success' | 'error' | 'info'

type Toast = {
  id: string
  type: ToastType
  message: string
}

type ToastStore = {
  toasts: Toast[]
  addToast: (type: ToastType, message: string) => void
  removeToast: (id: string) => void
}

let toastCounter = 0

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (type, message) => {
    const id = `toast-${++toastCounter}`
    set((state) => ({ toasts: [...state.toasts, { id, type, message }] }))
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, 3500)
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))