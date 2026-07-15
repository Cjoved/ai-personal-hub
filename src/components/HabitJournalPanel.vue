<script setup>
import { computed, ref, toRef, watch } from 'vue'
import {
  JOURNAL_PROMPTS,
  emptyDailyJournal,
  journalFilledCount,
  localDateKey,
  shiftDateKey,
} from '../composables/useHabits'
import FinanceDateInput from './FinanceDateInput.vue'

const props = defineProps({
  api: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['toast'])

const todayKey = toRef(props.api, 'todayKey')
const isSaving = toRef(props.api, 'isSaving')
const journalFeed = toRef(props.api, 'journalFeed')
const checkInJournalEntries = toRef(props.api, 'checkInJournalEntries')

const selectedDate = ref(localDateKey())
const form = ref(emptyDailyJournal())
const isDirty = ref(false)

const moodOptions = [1, 2, 3, 4, 5]

const selectedLabel = computed(() =>
  new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${selectedDate.value}T12:00:00`)),
)

const isToday = computed(() => selectedDate.value === todayKey.value)

const filledCount = computed(() => journalFilledCount(form.value))

const coreMissing = computed(() => {
  const keep = !String(form.value.keep_doing || '').trim()
  const avoid = !String(form.value.avoid_doing || '').trim()
  const mood = form.value.mood == null
  return keep || avoid || mood
})

const pastCards = computed(() =>
  (journalFeed.value || []).filter((row) => row.id && journalFilledCount(row) > 0),
)

const checkInGroups = computed(() => {
  const groups = new Map()
  for (const entry of checkInJournalEntries.value || []) {
    if (!groups.has(entry.dateKey)) groups.set(entry.dateKey, [])
    groups.get(entry.dateKey).push(entry)
  }
  return [...groups.entries()]
    .sort((a, b) => String(b[0]).localeCompare(String(a[0])))
    .map(([dateKey, entries]) => ({ dateKey, entries }))
})

function loadDate(dateKey) {
  const key = dateKey || todayKey.value
  selectedDate.value = key
  const existing = props.api.getDailyJournal?.(key) || emptyDailyJournal(key)
  form.value = {
    id: existing.id || null,
    journal_on: key,
    keep_doing: existing.keep_doing || '',
    avoid_doing: existing.avoid_doing || '',
    win: existing.win || '',
    tomorrow_focus: existing.tomorrow_focus || '',
    mood: existing.mood ?? null,
  }
  isDirty.value = false
}

function goDay(delta) {
  loadDate(shiftDateKey(selectedDate.value, delta))
}

function markDirty() {
  isDirty.value = true
}

function setMood(value) {
  form.value.mood = form.value.mood === value ? null : value
  markDirty()
}

function truncate(text, max = 96) {
  const value = String(text || '').trim()
  if (!value) return ''
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

function formatDay(dateKey) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${dateKey}T12:00:00`))
}

function sentimentLabel(sentiment) {
  if (!sentiment) return ''
  if (typeof sentiment === 'string') return sentiment
  return sentiment.label || sentiment.summary || ''
}

async function saveJournal() {
  const ok = await props.api.saveDailyJournal({
    journal_on: selectedDate.value,
    keep_doing: form.value.keep_doing,
    avoid_doing: form.value.avoid_doing,
    win: form.value.win,
    tomorrow_focus: form.value.tomorrow_focus,
    mood: form.value.mood,
  })
  if (!ok) {
    emit('toast', {
      type: 'error',
      message: props.api.errorMessage?.value || 'Could not save journal.',
    })
    return
  }
  isDirty.value = false
  loadDate(selectedDate.value)
  emit('toast', { type: 'success', message: 'Journal saved' })
}

watch(
  () => todayKey.value,
  (key) => {
    if (!isDirty.value) loadDate(key)
  },
  { immediate: true },
)
</script>

<template>
  <div class="habits-journal space-y-5">
    <header class="habits-hero habits-hero--journal rounded-3xl p-5 sm:p-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div class="min-w-0">
          <p class="habits-kicker">Daily learnings</p>
          <h2 class="habits-hero-title mt-1">Journal</h2>
          <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Same prompts every day — keep, cut, win, and one focus for tomorrow.
          </p>
          <p class="mt-2 text-xs font-bold text-slate-500">
            {{ filledCount }}/5 filled
            <span v-if="coreMissing" class="text-amber-700 dark:text-amber-300">
              · nudge: fill Keep, Cut, and Mood when you can
            </span>
          </p>
        </div>

        <div class="habits-journal-nav flex flex-wrap items-center gap-2">
          <button class="habits-ghost-btn" type="button" aria-label="Previous day" @click="goDay(-1)">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            v-if="!isToday"
            class="habits-ghost-btn"
            type="button"
            @click="loadDate(todayKey)"
          >
            Today
          </button>
          <button class="habits-ghost-btn" type="button" aria-label="Next day" :disabled="isToday" @click="goDay(1)">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
          <div class="habits-journal-date-input min-w-0 flex-1 sm:min-w-[11rem] sm:flex-none">
            <FinanceDateInput
              :model-value="selectedDate"
              aria-label="Journal date"
              @update:model-value="loadDate"
            />
          </div>
        </div>
      </div>
    </header>

    <article class="habits-journal-card rounded-3xl p-4 sm:p-5">
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <p class="text-xs font-extrabold uppercase tracking-wide text-teal-700/80 dark:text-teal-300/80">
            {{ isToday ? 'Today' : 'Day' }}
          </p>
          <h3 class="mt-0.5 text-lg font-extrabold text-slate-950 dark:text-slate-50">{{ selectedLabel }}</h3>
        </div>
        <span class="habits-journal-pill">{{ filledCount }}/5</span>
      </div>

      <form class="space-y-4" @submit.prevent="saveJournal">
        <div v-for="prompt in JOURNAL_PROMPTS" :key="prompt.key" class="habits-journal-field">
          <label class="habit-modal-label" :for="`journal-${prompt.key}`">{{ prompt.label }}</label>
          <p class="mb-1.5 text-xs text-slate-500">{{ prompt.hint }}</p>
          <textarea
            :id="`journal-${prompt.key}`"
            v-model="form[prompt.key]"
            class="habit-modal-textarea"
            rows="2"
            :placeholder="prompt.placeholder"
            @input="markDirty"
          />
        </div>

        <div class="habits-journal-field">
          <p class="habit-modal-label">Mood</p>
          <p class="mb-1.5 text-xs text-slate-500">How was your overall day?</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="value in moodOptions"
              :key="value"
              class="habits-journal-mood"
              :class="{ 'habits-journal-mood--active': form.mood === value }"
              type="button"
              :aria-pressed="form.mood === value"
              @click="setMood(value)"
            >
              {{ value }}
            </button>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-end gap-2 pt-1">
          <button
            class="habits-primary-btn disabled:opacity-50"
            type="submit"
            :disabled="isSaving"
          >
            {{ isSaving ? 'Saving…' : 'Save journal' }}
          </button>
        </div>
      </form>
    </article>

    <section class="space-y-3">
      <div class="flex items-end justify-between gap-3">
        <div>
          <h3 class="type-card-title">Past days</h3>
          <p class="type-caption type-muted mt-0.5">Tap a day to edit its prompts.</p>
        </div>
      </div>

      <div v-if="!pastCards.length" class="habits-empty rounded-2xl p-5 text-center">
        <p class="font-extrabold text-slate-900 dark:text-slate-100">No learnings yet</p>
        <p class="mt-1 text-sm text-slate-500">Answer today’s Keep / Cut / Win prompts to start your feed.</p>
      </div>

      <div v-else class="space-y-2">
        <button
          v-for="row in pastCards"
          :key="row.id || row.journal_on"
          class="habits-journal-day-card w-full rounded-2xl p-3.5 text-left"
          :class="{ 'habits-journal-day-card--active': row.journal_on === selectedDate }"
          type="button"
          @click="loadDate(row.journal_on)"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <strong class="block text-sm font-extrabold text-slate-950 dark:text-slate-50">
                {{ formatDay(row.journal_on) }}
              </strong>
              <p v-if="row.keep_doing" class="mt-1 text-xs text-slate-600 dark:text-slate-300">
                <span class="font-bold text-emerald-700 dark:text-emerald-300">Keep · </span>{{ truncate(row.keep_doing) }}
              </p>
              <p v-if="row.avoid_doing" class="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                <span class="font-bold text-rose-700 dark:text-rose-300">Cut · </span>{{ truncate(row.avoid_doing) }}
              </p>
              <p v-if="row.win" class="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                <span class="font-bold text-amber-700 dark:text-amber-300">Win · </span>{{ truncate(row.win) }}
              </p>
            </div>
            <span v-if="row.mood != null" class="habits-journal-pill shrink-0">Mood {{ row.mood }}</span>
          </div>
        </button>
      </div>
    </section>

    <section class="space-y-3">
      <div>
        <h3 class="type-card-title">From check-ins</h3>
        <p class="type-caption type-muted mt-0.5">Mood and notes logged on habit check-ins.</p>
      </div>

      <div v-if="!checkInGroups.length" class="habits-empty rounded-2xl p-4 text-center">
        <p class="text-sm text-slate-500">No check-in journals yet. Use “Mood & journal” on Today.</p>
      </div>

      <div v-else class="space-y-3">
        <article
          v-for="group in checkInGroups"
          :key="group.dateKey"
          class="habits-journal-checkin-group rounded-2xl p-3.5"
        >
          <p class="text-xs font-extrabold uppercase tracking-wide text-slate-500">{{ formatDay(group.dateKey) }}</p>
          <ul class="mt-2 space-y-2">
            <li
              v-for="entry in group.entries"
              :key="entry.id"
              class="habits-journal-checkin-item rounded-xl px-3 py-2.5"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                    <span
                      class="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
                      :style="{ background: entry.habitColor }"
                    />
                    {{ entry.habitTitle }}
                  </p>
                  <p v-if="entry.note" class="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {{ entry.note }}
                  </p>
                  <p
                    v-if="sentimentLabel(entry.sentiment)"
                    class="mt-1 text-[0.65rem] font-bold uppercase tracking-wide text-teal-700 dark:text-teal-300"
                  >
                    {{ sentimentLabel(entry.sentiment) }}
                  </p>
                </div>
                <span v-if="entry.mood != null" class="habits-journal-pill shrink-0">{{ entry.mood }}</span>
              </div>
            </li>
          </ul>
        </article>
      </div>
    </section>
  </div>
</template>
