<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useTaskAssistant } from '../composables/useTaskAssistant'
import { useVoice } from '../composables/useVoice'

const props = defineProps({
  onDataChange: {
    type: Function,
    default: null,
  },
})

const assistant = useTaskAssistant({ onDataChange: () => props.onDataChange?.() })
const {
  isSupported,
  isListening,
  isMuted,
  interimTranscript,
  voiceHint,
  voiceLanguage,
  voiceLanguageOptions,
  listen,
  speak,
  stopSpeaking,
  stopListening,
  submitListening,
  setVoiceLanguage,
  toggleMute,
} = useVoice()

const draft = ref('')
const draftInputRef = ref(null)
const showLanguageMenu = ref(false)
const sessionUseVoice = ref(false)

const composerValue = computed({
  get() {
    if (isListening.value && interimTranscript.value) {
      const base = draft.value.trim()
      return base ? `${base} ${interimTranscript.value}` : interimTranscript.value
    }
    return draft.value
  },
  set(value) {
    draft.value = value
  },
})

function resizeComposer() {
  const el = draftInputRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 160)}px`
}

function onComposerInput(event) {
  composerValue.value = event.target.value
  resizeComposer()
}

watch([draft, interimTranscript, isListening], () => {
  nextTick(resizeComposer)
})

const {
  isOpen,
  messages,
  isLoading,
  isApplying,
  errorMessage,
  pendingActions,
  hasPendingConfirm,
  open,
  close,
  sendMessage,
  applyPending,
  cancelPending,
} = assistant

async function handleSend({ voice = sessionUseVoice.value } = {}) {
  const text = draft.value.trim()
  if (!text || hasPendingConfirm.value) return

  draft.value = ''

  const reply = await sendMessage(text, { mode: voice ? 'voice' : 'text' })
  if (reply && voice && !isMuted.value) {
    speak(reply.content)
  }
}

async function handleExecute(action) {
  const reply = await applyPending(action, { mode: sessionUseVoice.value ? 'voice' : 'text' })
  if (reply && sessionUseVoice.value && !isMuted.value) {
    speak(reply.content)
  }
}

function handleCancel() {
  cancelPending()
}

async function handleMic() {
  errorMessage.value = ''
  if (isListening.value) {
    submitListening()
    return
  }

  try {
    sessionUseVoice.value = true
    const heard = await listen()
    if (!heard) return

    const existing = draft.value.trim()
    draft.value = existing ? `${existing} ${heard}` : heard
  } catch (error) {
    if (error.code !== 'aborted') errorMessage.value = error.message
  }
}

function handleClose() {
  stopSpeaking()
  stopListening()
  sessionUseVoice.value = false
  close()
}

defineExpose({ open })
</script>

<template>
  <div>
    <button
      class="task-assistant-fab fixed bottom-5 right-5 z-[200] grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-600/30 transition hover:scale-105"
      type="button"
      aria-label="Open task assistant"
      @click="open"
    >
      <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
      </svg>
    </button>

    <div
      v-if="isOpen"
      class="task-assistant-layer fixed inset-0 z-[210]"
    >
      <button
        class="absolute inset-0 bg-slate-950/25 lg:bg-transparent"
        type="button"
        aria-label="Close assistant"
        @click="handleClose"
      />

      <section class="task-assistant-panel shell-header pointer-events-auto fixed right-5 flex h-[min(78dvh,36rem)] w-[min(calc(100vw-2.5rem),24rem)] flex-col overflow-hidden rounded-2xl shadow-2xl" style="bottom: max(5.5rem, calc(1.25rem + env(safe-area-inset-bottom, 0px)));">
        <header class="flex items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-3 dark:border-slate-700">
          <div>
            <p class="type-kicker text-emerald-600">Assistant</p>
            <h2 class="type-section font-bold text-slate-950 dark:text-slate-100">Task chat</h2>
          </div>
          <div class="flex items-center gap-2">
            <div class="relative">
              <button
                class="grid h-9 w-9 place-items-center rounded-lg border border-slate-200/90 text-slate-600 dark:border-slate-700"
                type="button"
                title="Voice language"
                @click="showLanguageMenu = !showLanguageMenu"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </button>
              <div
                v-if="showLanguageMenu"
                class="absolute right-0 top-10 z-10 min-w-[8rem] rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
              >
                <button
                  v-for="option in voiceLanguageOptions"
                  :key="option.id"
                  class="block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold"
                  :class="voiceLanguage === option.id ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200' : 'text-slate-600 dark:text-slate-300'"
                  type="button"
                  @click="setVoiceLanguage(option.id); showLanguageMenu = false"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>
            <button
              class="grid h-9 w-9 place-items-center rounded-lg border border-slate-200/90 text-slate-600 dark:border-slate-700"
              type="button"
              :title="isMuted ? 'Unmute replies' : 'Mute voice replies'"
              @click="toggleMute()"
            >
              <svg v-if="!isMuted" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 5 6 9H2v6h4l5 4V5z" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
              <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 5 6 9H2v6h4l5 4V5z" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            </button>
            <button
              class="grid h-9 w-9 place-items-center rounded-lg border border-slate-200/90 text-slate-600 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700"
              type="button"
              aria-label="Close assistant"
              @click="handleClose"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        <div class="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          <p v-if="!messages.length" class="type-caption type-muted rounded-xl border border-dashed border-slate-300 px-3 py-6 text-center dark:border-slate-600">
            Task assistant — gumawa ng list/task, mark done, tanungin ang overdue, o i-schedule.
            <br />
            Hal: "Gumawa ng list na Groceries sa Personal" · "Ano overdue ko?"
          </p>

          <template v-for="(message, index) in messages" :key="index">
            <article
              class="max-w-[90%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm"
              :class="
                message.role === 'user'
                  ? 'ml-auto bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'
              "
            >
              {{ message.content }}
            </article>

            <div
              v-if="message.role === 'assistant' && message.pendingActions?.length && index === messages.length - 1"
              class="max-w-[90%] space-y-2"
            >
              <div
                v-for="action in message.pendingActions"
                :key="action.id"
                class="rounded-xl border px-3 py-3 text-sm"
                :class="action.destructive ? 'border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/30' : 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-950/20'"
              >
                <p class="font-medium text-slate-800 dark:text-slate-100">{{ action.preview }}</p>
                <div class="mt-2 flex gap-2">
                  <button
                    class="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    type="button"
                    :disabled="isApplying"
                    @click="handleExecute(action)"
                  >
                    Execute
                  </button>
                  <button
                    class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
                    type="button"
                    :disabled="isApplying"
                    @click="handleCancel"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </template>

          <p v-if="voiceHint && isListening" class="type-caption rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
            {{ voiceHint }}
          </p>
          <p v-if="interimTranscript && isListening" class="type-caption italic text-slate-500">{{ interimTranscript }}</p>
          <p v-if="isLoading" class="type-caption text-slate-500">Assistant is thinking…</p>
          <p v-if="errorMessage" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{{ errorMessage }}</p>
        </div>

        <footer class="border-t border-slate-200/80 p-3 dark:border-slate-700">
          <p v-if="hasPendingConfirm" class="type-caption mb-2 text-amber-700 dark:text-amber-300">
            Confirm or cancel the action above before sending another message.
          </p>
          <form class="assistant-composer" @submit.prevent="handleSend()">
            <div
              class="assistant-composer-inner"
              :class="{ 'assistant-composer-inner--listening': isListening }"
            >
              <textarea
                ref="draftInputRef"
                :value="composerValue"
                class="assistant-composer-input"
                rows="1"
                :placeholder="isListening ? 'Listening…' : 'Message Tasker…'"
                :disabled="isLoading || isListening || hasPendingConfirm"
                @input="onComposerInput"
              />

              <button
                v-if="draft.trim()"
                class="assistant-composer-send"
                type="submit"
                :disabled="isLoading || hasPendingConfirm"
                aria-label="Send message"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m22 2-7 20-4-9-9-4 20-7z" />
                </svg>
              </button>
              <button
                v-else
                class="assistant-composer-mic"
                :class="{ 'assistant-composer-mic--active': isListening }"
                type="button"
                :disabled="isLoading || !isSupported || hasPendingConfirm"
                :aria-label="isListening ? 'Stop listening' : 'Speak'"
                @click="handleMic"
              >
                <svg v-if="!isListening" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
                <span v-else class="assistant-composer-mic-pulse" />
              </button>
            </div>
          </form>
        </footer>
      </section>
    </div>
  </div>
</template>
