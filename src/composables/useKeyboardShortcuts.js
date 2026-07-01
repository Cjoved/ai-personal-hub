import { onMounted, onUnmounted } from 'vue'

export function useKeyboardShortcuts(handlers = {}) {
  function onKeyDown(event) {
    const target = event.target
    const tag = target?.tagName?.toLowerCase()
    const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      handlers.focusSearch?.()
      return
    }

    if (isTyping) return

    if (event.key.toLowerCase() === 'n') {
      event.preventDefault()
      handlers.newTask?.()
      return
    }

    if (event.key === 'Escape') {
      handlers.escape?.()
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown)
  })
}
