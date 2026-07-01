import { ref } from 'vue'

const dialog = ref({
  open: false,
  title: 'Are you sure?',
  message: '',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  tone: 'danger',
})

let resolver = null

export function useConfirm() {
  function confirm(options = {}) {
    return new Promise((resolve) => {
      resolver = resolve
      dialog.value = {
        open: true,
        title: options.title || 'Are you sure?',
        message: options.message || '',
        confirmLabel: options.confirmLabel || 'Confirm',
        cancelLabel: options.cancelLabel || 'Cancel',
        tone: options.tone || 'danger',
      }
    })
  }

  function answer(value) {
    dialog.value = { ...dialog.value, open: false }
    resolver?.(value)
    resolver = null
  }

  return {
    dialog,
    confirm,
    confirmDelete: (itemLabel, itemName = '') =>
      confirm({
        title: `Delete ${itemLabel}?`,
        message: itemName
          ? `Are you sure you want to delete "${itemName}"? This cannot be undone.`
          : `Are you sure you want to delete this ${itemLabel.toLowerCase()}? This cannot be undone.`,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        tone: 'danger',
      }),
    answer,
  }
}
