import { ref } from 'vue'

const toasts = ref([])
let nextId = 0

function removeToast(id) {
  toasts.value = toasts.value.filter((toast) => toast.id !== id)
}

function pushToast(type, message, options = {}) {
  const id = ++nextId
  const duration = options.duration ?? 4200
  const toast = {
    id,
    type,
    message,
    actionLabel: options.actionLabel ?? null,
    onAction: options.onAction ?? null,
  }

  toasts.value = [...toasts.value, toast]

  window.setTimeout(() => {
    removeToast(id)
  }, duration)
}

export function useToast() {
  return {
    toasts,
    success(message, options) {
      pushToast('success', message, options)
    },
    successWithUndo(message, onUndo) {
      pushToast('success', message, {
        actionLabel: 'Undo',
        onAction: onUndo,
        duration: 8000,
      })
    },
    error(message) {
      pushToast('error', message)
    },
    dismiss: removeToast,
  }
}
