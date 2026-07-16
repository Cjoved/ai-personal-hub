<script setup>
import { computed, ref, toRef, watch } from 'vue'
import {
  JOURNAL_PROMPTS,
  emptyDailyJournal,
  habitDayKey,
  journalFilledCount,
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

const selectedDate = ref(habitDayKey())
const form = ref(emptyDailyJournal())
const isDirty = ref(false)
const modalMode = ref(null) // null | 'edit' | 'view'

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

const modalTitle = computed(() => {
  if (modalMode.value === 'view') return 'View journal'
  if (form.value.id) return 'Edit journal'
  return 'Fill up'
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

function openFillUp() {
  loadDate(selectedDate.value)
  modalMode.value = 'edit'
}

function openView(dateKey) {
  loadDate(dateKey)
  modalMode.value = 'view'
}

function openEdit(dateKey) {
  loadDate(dateKey)
  modalMode.value = 'edit'
}

function switchViewToEdit() {
  modalMode.value = 'edit'
}

function closeModal() {
  modalMode.value = null
  isDirty.value = false
  loadDate(selectedDate.value)
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
  modalMode.value = null
  emit('toast', { type: 'success', message: 'Journal saved' })
}

watch(
  () => todayKey.value,
  (key) => {
    if (!isDirty.value && !modalMode.value) loadDate(key)
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
          <p class="mt-1 text-xs text-slate-500">Habit day unlocks at 4:00 AM local time.</p>
          <p class="mt-2 text-xs font-bold text-slate-500">
            {{ filledCount }}/5 filled for {{ isToday ? 'today' : formatDay(selectedDate) }}
            <span v-if="coreMissing" class="text-amber-700 dark:text-amber-300">
              · nudge: fill Keep, Cut, and Mood when you can
            </span>
          </p>
        </div>

        <div class="flex flex-col items-stretch gap-2 sm:items-end">
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
          <button class="habits-primary-btn" type="button" @click="openFillUp">
            {{ form.id ? 'Edit entry' : 'Fill up' }}
          </button>
        </div>
      </div>
    </header>

    <section class="space-y-3">
      <div class="flex items-end justify-between gap-3">
        <div>
          <h3 class="type-card-title">Past days</h3>
          <p class="type-caption type-muted mt-0.5">View full notes or edit a day.</p>
        </div>
      </div>

      <div v-if="!pastCards.length" class="habits-empty rounded-2xl p-5 text-center">
        <p class="font-extrabold text-slate-900 dark:text-slate-100">No learnings yet</p>
        <p class="mt-1 text-sm text-slate-500">Use Fill up to answer Keep / Cut / Win prompts.</p>
        <button class="habits-primary-btn mt-3" type="button" @click="openFillUp">Fill up</button>
      </div>

      <div v-else class="space-y-2">
        <article
          v-for="row in pastCards"
          :key="row.id || row.journal_on"
          class="habits-journal-day-card w-full rounded-2xl p-3.5 text-left"
          :class="{ 'habits-journal-day-card--active': row.journal_on === selectedDate }"
        >
          <div class="flex items-start justify-between gap-3">
            <button
              class="habits-journal-day-card__body min-w-0 flex-1 text-left"
              type="button"
              @click="openView(row.journal_on)"
            >
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
            </button>
            <div class="habits-journal-day-card__tools shrink-0">
              <span v-if="row.mood != null" class="habits-journal-pill">Mood {{ row.mood }}</span>
              <div class="habits-journal-day-card__actions">
                <button
                  class="habits-journal-icon-btn"
                  type="button"
                  aria-label="View journal"
                  title="View"
                  @click="openView(row.journal_on)"
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
                <button
                  class="habits-journal-icon-btn"
                  type="button"
                  aria-label="Edit journal"
                  title="Edit"
                  @click="openEdit(row.journal_on)"
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </article>
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

    <Teleport to="body">
      <div
        v-if="modalMode"
        class="habit-modal-backdrop"
        role="presentation"
        @click.self="closeModal"
      >
        <div
          class="habit-modal-panel"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="modalMode === 'view' ? 'journal-view-title' : 'journal-edit-title'"
        >
          <div class="habit-modal-handle" aria-hidden="true"></div>
          <header class="habit-modal-header">
            <div class="min-w-0">
              <p class="habits-kicker">{{ isToday ? 'Today' : 'Day' }}</p>
              <h3
                :id="modalMode === 'view' ? 'journal-view-title' : 'journal-edit-title'"
                class="habit-modal-title"
              >
                {{ modalTitle }}
              </h3>
              <p class="habit-modal-subtitle">{{ selectedLabel }} · {{ filledCount }}/5</p>
            </div>
            <button class="habit-modal-close" type="button" aria-label="Close" @click="closeModal">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </header>

          <!-- View mode -->
          <div v-if="modalMode === 'view'" class="habit-modal-body space-y-4">
            <div v-for="prompt in JOURNAL_PROMPTS" :key="`view-${prompt.key}`" class="habits-journal-field">
              <p class="habit-modal-label">{{ prompt.label }}</p>
              <p class="mb-1.5 text-xs text-slate-500">{{ prompt.hint }}</p>
              <p class="habits-journal-view-text">
                {{ String(form[prompt.key] || '').trim() || '—' }}
              </p>
            </div>
            <div class="habits-journal-field">
              <p class="habit-modal-label">Mood</p>
              <p class="mb-1.5 text-xs text-slate-500">How was your overall day?</p>
              <p class="habits-journal-view-text">
                {{ form.mood != null ? `Mood ${form.mood}` : '—' }}
              </p>
            </div>
          </div>

          <!-- Edit / fill mode -->
          <form
            v-else
            class="habit-modal-body space-y-4"
            @submit.prevent="saveJournal"
          >
            <div v-for="prompt in JOURNAL_PROMPTS" :key="prompt.key" class="habits-journal-field">
              <label class="habit-modal-label" :for="`journal-modal-${prompt.key}`">{{ prompt.label }}</label>
              <p class="mb-1.5 text-xs text-slate-500">{{ prompt.hint }}</p>
              <textarea
                :id="`journal-modal-${prompt.key}`"
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
          </form>

          <footer class="habit-modal-footer">
            <template v-if="modalMode === 'view'">
              <button class="habit-modal-secondary" type="button" @click="closeModal">Close</button>
              <button class="habits-primary-btn" type="button" @click="switchViewToEdit">Edit</button>
            </template>
            <template v-else>
              <button class="habit-modal-secondary" type="button" @click="closeModal">Cancel</button>
              <button
                class="habits-primary-btn disabled:opacity-50"
                type="button"
                :disabled="isSaving"
                @click="saveJournal"
              >
                {{ isSaving ? 'Saving…' : 'Save journal' }}
              </button>
            </template>
          </footer>
        </div>
      </div>
    </Teleport>
  </div>
</template>
