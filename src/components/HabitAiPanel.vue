<script setup>
import { computed, ref } from 'vue'
import { supabase } from '../lib/supabase'

const props = defineProps({
  api: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['toast', 'create-from-suggestion'])

const isOpen = ref(false)
const tab = ref('log')
const utterance = ref('')
const coachMessage = ref('')
const proposals = ref([])
const suggestions = ref([])
const coachReplies = ref([])
const isBusy = ref(false)

const habits = computed(() => props.api.activeHabits?.value || [])

function open() {
  isOpen.value = true
}

function close() {
  isOpen.value = false
}

async function authHeaders() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Sign in required for Habit AI.')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

async function parseLog() {
  if (!utterance.value.trim() || isBusy.value) return
  isBusy.value = true
  proposals.value = []
  try {
    const headers = await authHeaders()
    const res = await fetch('/api/ai/habits/log', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        text: utterance.value.trim(),
        habits: habits.value.map((h) => ({
          id: h.id,
          title: h.title,
          habit_type: h.habit_type,
          target_value: h.target_value,
          unit: h.unit,
        })),
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Parse failed')
    proposals.value = data.proposals || []
    if (!proposals.value.length) emit('toast', { type: 'error', message: 'No matching habits found in that text.' })
  } catch (error) {
    emit('toast', { type: 'error', message: error.message || 'NL log failed.' })
  } finally {
    isBusy.value = false
  }
}

async function applyProposal(proposal) {
  const ok = await props.api.logCheck(proposal.habitId, {
    value: proposal.value ?? null,
    status: 'completed',
    journal_note: proposal.note || null,
  })
  emit('toast', {
    type: ok ? 'success' : 'error',
    message: ok ? `Logged “${proposal.title || 'habit'}”` : props.api.errorMessage.value || 'Could not log.',
  })
  if (ok) {
    proposals.value = proposals.value.filter((item) => item.habitId !== proposal.habitId)
  }
}

async function fetchRecommendations() {
  isBusy.value = true
  suggestions.value = []
  try {
    const headers = await authHeaders()
    const rows = props.api.habitRows?.value || []
    const res = await fetch('/api/ai/habits/recommend', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        habits: habits.value.map((h) => ({
          id: h.id,
          title: h.title,
          habit_type: h.habit_type,
          frequency: h.frequency,
          category_id: h.category_id,
        })),
        summary: {
          activeCount: habits.value.length,
          longestStreak: Math.max(0, ...rows.map((r) => r.streaks?.best || 0)),
          weekPct: props.api.historySeries?.value?.at?.(-1)?.value ?? 0,
        },
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Recommend failed')
    suggestions.value = data.suggestions || []
  } catch (error) {
    emit('toast', { type: 'error', message: error.message || 'Recommendations failed.' })
  } finally {
    isBusy.value = false
  }
}

async function sendCoach() {
  if (!coachMessage.value.trim() || isBusy.value) return
  const content = coachMessage.value.trim()
  coachMessage.value = ''
  coachReplies.value = [...coachReplies.value, { role: 'user', content }]
  isBusy.value = true
  try {
    const headers = await authHeaders()
    const rows = props.api.habitRows?.value || []
    const res = await fetch('/api/ai/habits/coach', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: content,
        context: {
          progress: props.api.progress?.value,
          habits: rows.slice(0, 12).map((row) => ({
            title: row.habit.title,
            streak: row.streaks.current,
            best: row.streaks.best,
            dueToday: row.dueToday,
            checkedToday: row.checkedToday,
            atRisk: row.atRisk,
            risk: row.risk,
          })),
          anomalies: props.api.anomalies?.value || [],
          mood: props.api.moodSeries?.value || [],
        },
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Coach failed')
    coachReplies.value = [...coachReplies.value, { role: 'assistant', content: data.reply || '…' }]
  } catch (error) {
    coachReplies.value = [...coachReplies.value, { role: 'assistant', content: error.message || 'Coach unavailable.' }]
  } finally {
    isBusy.value = false
  }
}

function acceptSuggestion(item) {
  emit('create-from-suggestion', {
    title: item.title,
    notes: item.reason || '',
    habit_type: item.habit_type || 'boolean',
    frequency: item.frequency || 'daily',
    target_value: item.target_value ?? null,
    unit: item.unit || null,
    color: '#0d9488',
  })
}

function selectTab(next) {
  tab.value = next
  if (next === 'rec' && !suggestions.value.length) fetchRecommendations()
}

defineExpose({ open, close })
</script>

<template>
  <div>
    <button
      class="habit-ai-fab"
      type="button"
      aria-label="Open Habit AI"
      @click="open"
    >
      <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M12 3c-1.8 3.2-4 4.8-4 8a4 4 0 0 0 8 0c0-3.2-2.2-4.8-4-8Z" />
        <path d="M9 18h6M10 21h4" />
      </svg>
    </button>

    <Teleport to="body">
      <div v-if="isOpen" class="habit-ai-layer">
        <button class="habit-ai-backdrop" type="button" aria-label="Close Habit AI" @click="close" />

        <section class="habit-ai-panel" role="dialog" aria-modal="true" aria-label="Habit AI">
          <header class="habit-ai-panel__header">
            <div class="min-w-0">
              <p class="habits-kicker">Habit AI</p>
              <h2 class="font-extrabold text-slate-950 dark:text-slate-50">Log · Suggest · Coach</h2>
            </div>
            <button class="habit-ai-close" type="button" aria-label="Close" @click="close">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </header>

          <div class="habit-ai-tabs">
            <button class="habits-chip" :class="{ 'habits-chip--active': tab === 'log' }" type="button" @click="selectTab('log')">NL log</button>
            <button class="habits-chip" :class="{ 'habits-chip--active': tab === 'rec' }" type="button" @click="selectTab('rec')">Suggest</button>
            <button class="habits-chip" :class="{ 'habits-chip--active': tab === 'coach' }" type="button" @click="selectTab('coach')">Coach</button>
          </div>

          <div class="habit-ai-panel__body">
            <div v-if="tab === 'log'" class="space-y-3">
              <label class="habit-modal-label" for="habit-nl">Natural language check-in</label>
              <textarea
                id="habit-nl"
                v-model="utterance"
                class="habit-modal-textarea"
                rows="3"
                placeholder='e.g. “nag-workout ako at nagbasa ng 20 pages”'
              />
              <button class="habits-primary-btn w-full disabled:opacity-50" type="button" :disabled="isBusy || !utterance.trim()" @click="parseLog">
                {{ isBusy ? 'Parsing…' : 'Parse & propose' }}
              </button>
              <ul v-if="proposals.length" class="space-y-2">
                <li
                  v-for="proposal in proposals"
                  :key="proposal.habitId"
                  class="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700"
                >
                  <div class="min-w-0">
                    <p class="truncate text-sm font-bold">{{ proposal.title }}</p>
                    <p class="text-xs text-slate-500">
                      <span v-if="proposal.value != null">{{ proposal.value }}{{ proposal.unit ? ` ${proposal.unit}` : '' }} · </span>
                      {{ proposal.reason || 'Matched from your text' }}
                    </p>
                  </div>
                  <button class="habits-ghost-btn" type="button" @click="applyProposal(proposal)">Log</button>
                </li>
              </ul>
            </div>

            <div v-else-if="tab === 'rec'" class="space-y-3">
              <p class="text-sm text-slate-500">Suggestions based on your current habits.</p>
              <button class="habits-primary-btn w-full disabled:opacity-50" type="button" :disabled="isBusy" @click="fetchRecommendations">
                {{ isBusy ? 'Thinking…' : 'Refresh suggestions' }}
              </button>
              <ul class="space-y-2">
                <li
                  v-for="(item, index) in suggestions"
                  :key="`${item.title}-${index}`"
                  class="flex items-start justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700"
                >
                  <div>
                    <p class="text-sm font-bold">{{ item.title }}</p>
                    <p class="text-xs text-slate-500">{{ item.reason }}</p>
                  </div>
                  <button class="habits-ghost-btn shrink-0" type="button" @click="acceptSuggestion(item)">Add</button>
                </li>
              </ul>
            </div>

            <div v-else class="flex h-full min-h-0 flex-col gap-3">
              <div class="habit-ai-chat min-h-0 flex-1 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-3 dark:bg-slate-950/40">
                <p v-if="!coachReplies.length" class="text-xs text-slate-500">
                  Ask for motivation or a plan for today. Context includes streaks and risk flags.
                </p>
                <div
                  v-for="(msg, index) in coachReplies"
                  :key="index"
                  class="text-sm"
                  :class="msg.role === 'user' ? 'text-right font-semibold text-teal-800 dark:text-teal-200' : 'text-slate-700 dark:text-slate-200'"
                >
                  {{ msg.content }}
                </div>
              </div>
              <form class="flex gap-2" @submit.prevent="sendCoach">
                <input v-model="coachMessage" class="habit-modal-input min-w-0 flex-1" placeholder="How should I protect my streak today?" />
                <button class="habits-primary-btn disabled:opacity-50" type="submit" :disabled="isBusy || !coachMessage.trim()">Send</button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </Teleport>
  </div>
</template>
