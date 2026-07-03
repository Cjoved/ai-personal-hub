<script setup>
import { ref } from 'vue'
import { supabase } from '../lib/supabase'

const props = defineProps({
  listId: {
    type: String,
    default: null,
  },
  spaceId: {
    type: String,
    default: null,
  },
  updateTask: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits(['close'])

const suggestions = ref([])
const isLoading = ref(false)
const errorMessage = ref('')
const isApplying = ref(false)

async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token || null
}

async function fetchSuggestions() {
  isLoading.value = true
  errorMessage.value = ''
  suggestions.value = []

  try {
    const token = await getAccessToken()
    if (!token) throw new Error('Sign in required')

    const response = await fetch('/api/ai/schedule', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        listId: props.listId,
        spaceId: props.spaceId,
      }),
    })

    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || 'Schedule request failed')
    suggestions.value = payload.suggestions || []
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    isLoading.value = false
  }
}

async function applySuggestions() {
  if (!suggestions.value.length || isApplying.value) return
  isApplying.value = true
  errorMessage.value = ''

  try {
    for (const item of suggestions.value) {
      await props.updateTask(item.taskId, { due_date: item.suggestedDueDate })
    }
    emit('close')
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    isApplying.value = false
  }
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Manila',
  }).format(new Date(value))
}
</script>

<template>
  <div class="fixed inset-0 z-[240] grid place-items-center bg-slate-950/45 px-3 py-6 backdrop-blur-sm">
    <section class="shell-header w-full max-w-lg rounded-2xl p-5 shadow-2xl sm:p-6">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="type-kicker text-violet-600">AI Scheduler</p>
          <h2 class="type-page-title mt-1 text-slate-950 dark:text-slate-100">Suggest schedule</h2>
          <p class="type-caption type-muted mt-1">Preview due dates before applying.</p>
        </div>
        <button
          class="rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-sm font-bold text-slate-600"
          type="button"
          @click="emit('close')"
        >
          Close
        </button>
      </div>

      <div class="mt-5 space-y-4">
        <button
          class="type-button w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 px-4 py-2.5 font-bold text-white disabled:opacity-60"
          type="button"
          :disabled="isLoading"
          @click="fetchSuggestions"
        >
          {{ isLoading ? 'Thinking…' : 'Generate suggestions' }}
        </button>

        <p v-if="errorMessage" class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {{ errorMessage }}
        </p>

        <ul v-if="suggestions.length" class="max-h-64 space-y-2 overflow-y-auto">
          <li
            v-for="item in suggestions"
            :key="item.taskId"
            class="rounded-xl border border-slate-200/90 bg-white/80 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900/50"
          >
            <p class="type-body-sm font-semibold text-slate-900 dark:text-slate-100">{{ item.reason }}</p>
            <p class="type-caption type-muted mt-1">{{ formatDate(item.suggestedDueDate) }}</p>
          </li>
        </ul>

        <button
          v-if="suggestions.length"
          class="type-button w-full rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 font-bold text-emerald-800 disabled:opacity-60 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
          type="button"
          :disabled="isApplying"
          @click="applySuggestions"
        >
          {{ isApplying ? 'Applying…' : `Apply ${suggestions.length} suggestions` }}
        </button>
      </div>
    </section>
  </div>
</template>
