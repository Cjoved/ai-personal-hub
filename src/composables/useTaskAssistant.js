import { computed, ref } from 'vue'
import { supabase } from '../lib/supabase'

export function useTaskAssistant({ onDataChange } = {}) {
  const isOpen = ref(false)
  const messages = ref([])
  const isLoading = ref(false)
  const isApplying = ref(false)
  const errorMessage = ref('')
  const pendingActions = ref([])
  const phase = ref('chat')

  const hasPendingConfirm = computed(() => pendingActions.value.length > 0)

  function clearSession() {
    messages.value = []
    errorMessage.value = ''
    isLoading.value = false
    isApplying.value = false
    pendingActions.value = []
    phase.value = 'chat'
  }

  function open() {
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
    clearSession()
  }

  async function getAccessToken() {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token || null
  }

  function attachPendingToLastAssistant(payload) {
    pendingActions.value = payload.pendingActions || []
    phase.value = payload.phase || 'chat'

    if (messages.value.length && messages.value[messages.value.length - 1].role === 'assistant') {
      const last = messages.value[messages.value.length - 1]
      last.pendingActions = [...pendingActions.value]
      last.phase = phase.value
    }
  }

  async function sendMessage(content, { mode = 'text' } = {}) {
    const trimmed = content?.trim()
    if (!trimmed || isLoading.value || hasPendingConfirm.value) return null

    errorMessage.value = ''
    messages.value.push({ role: 'user', content: trimmed })
    isLoading.value = true

    try {
      const token = await getAccessToken()
      if (!token) throw new Error('You must be signed in to use the assistant.')

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode,
          messages: messages.value
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((message) => ({
              role: message.role,
              content: message.content,
            })),
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(
            'AI API is not running locally. Use `npx vercel dev` instead of `npm run dev` to test chat/voice replies.',
          )
        }
        throw new Error(payload.error || 'Assistant request failed')
      }

      const reply = {
        role: 'assistant',
        content: payload.reply,
        provider: payload.provider,
        voiceReply: Boolean(payload.voiceReply),
        pendingActions: payload.pendingActions || [],
        phase: payload.phase || 'chat',
      }
      messages.value.push(reply)
      attachPendingToLastAssistant(payload)
      return reply
    } catch (error) {
      errorMessage.value = error.message
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function applyPending(action, { mode = 'text' } = {}) {
    if (!action?.token || isApplying.value) return null

    isApplying.value = true
    errorMessage.value = ''

    try {
      const token = await getAccessToken()
      if (!token) throw new Error('You must be signed in.')

      const response = await fetch('/api/ai/apply', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: action.token, confirmed: true }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.error || 'Could not apply action')
      }

      if (payload.mutated) {
        await onDataChange?.()
      }

      pendingActions.value = []
      phase.value = 'chat'

      const reply = {
        role: 'assistant',
        content: payload.reply,
        voiceReply: mode === 'voice',
        phase: 'chat',
        pendingActions: [],
      }
      messages.value.push(reply)
      return reply
    } catch (error) {
      errorMessage.value = error.message
      return null
    } finally {
      isApplying.value = false
    }
  }

  function cancelPending() {
    pendingActions.value = []
    phase.value = 'chat'
    const last = messages.value[messages.value.length - 1]
    if (last?.role === 'assistant' && last.pendingActions?.length) {
      last.pendingActions = []
    }
    messages.value.push({
      role: 'assistant',
      content: 'Cancelled.',
      phase: 'chat',
      pendingActions: [],
    })
  }

  return {
    isOpen,
    messages,
    isLoading,
    isApplying,
    errorMessage,
    pendingActions,
    phase,
    hasPendingConfirm,
    open,
    close,
    clearSession,
    sendMessage,
    applyPending,
    cancelPending,
  }
}
