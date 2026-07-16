<script setup>
import { computed, onMounted, ref, toRef, watch } from 'vue'
import HabitAiPanel from './HabitAiPanel.vue'
import HabitJournalPanel from './HabitJournalPanel.vue'
import LiveTrendChart from './LiveTrendChart.vue'
import {
  formatReminderTime,
  frequencyLabel,
  isHabitDueOn,
  monthCompletionForHabit,
  shiftDateKey,
} from '../composables/useHabits'
import { useHabitDurationTimer } from '../composables/useHabitDurationTimer'
import { useHabitNotifications } from '../composables/useHabitNotifications'
import { supabase } from '../lib/supabase'
import { useConfirm } from '../composables/useConfirm'

const props = defineProps({
  api: {
    type: Object,
    required: true,
  },
  section: {
    type: String,
    default: 'today',
  },
})

const emit = defineEmits([
  'create-habit',
  'edit-habit',
  'manage-categories',
  'toast',
  'create-from-suggestion',
  'go-section',
])

const { confirmArchive } = useConfirm()

const showToday = computed(() => props.section === 'today' || props.section === 'habits')
const showInsights = computed(() => props.section === 'insights' || props.section === 'stats')
const showJournal = computed(() => props.section === 'journal')
const showCategories = computed(() => props.section === 'categories')

const expandedCategoryId = ref(null)

const habitRows = toRef(props.api, 'habitRows')
const categories = toRef(props.api, 'categories')
const selectedCategoryId = toRef(props.api, 'selectedCategoryId')
const focusHabitId = toRef(props.api, 'focusHabitId')
const focusHabit = toRef(props.api, 'focusHabit')
const heatMonth = toRef(props.api, 'heatMonth')
const heatCells = toRef(props.api, 'heatCells')
const checksByHabit = toRef(props.api, 'checksByHabit')
const todayKey = toRef(props.api, 'todayKey')
const historySeries = toRef(props.api, 'historySeries')
const monthlySeries = toRef(props.api, 'monthlySeries')
const anomalies = toRef(props.api, 'anomalies')
const moodSeries = toRef(props.api, 'moodSeries')
const progress = toRef(props.api, 'progress')
const offlinePending = toRef(props.api, 'offlinePending')
const isLoading = toRef(props.api, 'isLoading')
const errorMessage = toRef(props.api, 'errorMessage')
const activeHabits = toRef(props.api, 'activeHabits')

const logPanel = ref(null)
const logDateKey = ref(null)
const logValue = ref(null)
const logMood = ref(null)
const logNote = ref('')
const notifications = useHabitNotifications()
const notifyPermission = notifications.permission

const todayLabel = computed(() =>
  new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date()),
)

const sortedRows = computed(() => {
  const rows = [...(habitRows.value || [])]
  const rank = (row) => {
    if (row.stackParent && !row.stackUnlocked && !row.checkedToday) return 4
    if (row.reminderDue) return 0
    if (row.atRisk) return 1
    if (row.dueToday && !row.checkedToday) return 2
    if (row.dueToday && row.checkedToday) return 3
    return 5
  }
  return rows.sort((a, b) => rank(a) - rank(b) || a.habit.title.localeCompare(b.habit.title))
})

const dueTodayRows = computed(() => sortedRows.value.filter((row) => row.dueToday))
const checkedDueCount = computed(() => dueTodayRows.value.filter((row) => row.checkedToday).length)
const dueTodayCount = computed(() => dueTodayRows.value.length)
const dayProgressPct = computed(() =>
  dueTodayCount.value ? Math.round((checkedDueCount.value / dueTodayCount.value) * 100) : 0,
)
const reminderDueRows = computed(() => sortedRows.value.filter((row) => row.reminderDue))

const ringStyle = computed(() => ({
  background: `conic-gradient(var(--habit-done) ${dayProgressPct.value}%, color-mix(in srgb, var(--habit-streak) 18%, transparent) 0)`,
}))

const heatMonthLabel = computed(() => {
  const [year, month] = String(heatMonth.value).split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))
})

const monthRanking = computed(() => {
  const month = String(heatMonth.value || '').slice(0, 7)
  const today = todayKey.value || ''
  const map = checksByHabit.value
  return [...(habitRows.value || [])]
    .map((row) => {
      const set = map?.get?.(row.habit.id) || new Set()
      const stats = monthCompletionForHabit(row.habit, set, month, today, map)
      return {
        id: row.habit.id,
        title: row.habit.title,
        color: row.category?.color || '#0d9488',
        due: stats.due,
        done: stats.done,
        pct: stats.pct,
        streak: row.streaks?.current || 0,
      }
    })
    .filter((item) => item.due > 0)
    .sort((a, b) => b.pct - a.pct || b.done - a.done || a.title.localeCompare(b.title))
})

const atRiskInsights = computed(() =>
  [...(habitRows.value || [])]
    .filter((row) => row.atRisk || (row.risk || 0) >= 0.45)
    .sort((a, b) => (b.risk || 0) - (a.risk || 0) || a.habit.title.localeCompare(b.habit.title))
    .slice(0, 6)
    .map((row) => ({
      id: row.habit.id,
      title: row.habit.title,
      risk: Math.round((row.risk || 0) * 100),
      streak: row.streaks?.current || 0,
      dueToday: row.dueToday,
      checkedToday: row.checkedToday,
    })),
)

const longestStreak = computed(() =>
  Math.max(0, ...(habitRows.value || []).map((row) => row.streaks?.best || 0)),
)

const thisWeekPct = computed(() => {
  const series = historySeries.value || []
  return series.length ? series[series.length - 1].value : 0
})

const badgeLabels = {
  first_check: 'First check-in',
  streak_7: '7-day streak',
  streak_30: '30-day streak',
  quantity_pro: 'Quantity habit',
  level_5: 'Level 5',
  freeze_saver: 'Freeze used',
}

const unlockedBadges = computed(() =>
  (progress.value?.badges || []).map((id) => badgeLabels[id] || id),
)

const moodChartItems = computed(() =>
  (moodSeries.value || []).map((row) => ({
    label: row.label,
    value: row.avgMood,
    sublabel: `${row.moodLogs} mood log${row.moodLogs === 1 ? '' : 's'} · ${row.completions} completions`,
  })),
)

const categoryHub = computed(() => {
  const rows = habitRows.value || []
  const allHabits = activeHabits.value || []
  const map = checksByHabit.value
  const today = todayKey.value

  function habitPulse(habits) {
    const due = habits.filter((habit) => isHabitDueOn(habit, today, map))
    const done = due.filter((habit) => (map?.get?.(habit.id) || new Set()).has(today))
    let weekDue = 0
    let weekDone = 0
    for (let i = 0; i < 7; i += 1) {
      const key = shiftDateKey(today, -i)
      for (const habit of habits) {
        if (!isHabitDueOn(habit, key, map)) continue
        weekDue += 1
        if ((map?.get?.(habit.id) || new Set()).has(key)) weekDone += 1
      }
    }
    return {
      dueToday: due.length,
      doneToday: done.length,
      weekPct: weekDue ? Math.round((weekDone / weekDue) * 100) : 0,
    }
  }

  function rowForHabit(habit) {
    return rows.find((row) => row.habit.id === habit.id) || null
  }

  const cards = (categories.value || []).map((category) => {
    const habits = allHabits.filter((habit) => habit.category_id === category.id)
    const pulse = habitPulse(habits)
    return {
      ...category,
      habitCount: habits.length,
      habits: habits.map((habit) => {
        const row = rowForHabit(habit)
        return {
          id: habit.id,
          title: habit.title,
          habit,
          streak: row?.streaks?.current || 0,
          dueToday: row?.dueToday || false,
          checkedToday: row?.checkedToday || false,
        }
      }),
      ...pulse,
    }
  })

  const uncategorizedHabits = allHabits.filter((habit) => !habit.category_id)
  const uncategorizedPulse = habitPulse(uncategorizedHabits)

  return {
    cards,
    uncategorized: uncategorizedHabits.length,
    uncategorizedHabits: uncategorizedHabits.map((habit) => {
      const row = rowForHabit(habit)
      return {
        id: habit.id,
        title: habit.title,
        habit,
        streak: row?.streaks?.current || 0,
        dueToday: row?.dueToday || false,
        checkedToday: row?.checkedToday || false,
      }
    }),
    uncategorizedPulse,
    totals: {
      categories: cards.length,
      habits: allHabits.length,
      uncategorized: uncategorizedHabits.length,
    },
  }
})

function toggleCategoryExpand(id) {
  expandedCategoryId.value = expandedCategoryId.value === id ? null : id
}

function viewCategoryOnToday(categoryId) {
  selectedCategoryId.value = categoryId
  emit('go-section', 'today')
}

function createHabitInCategory(categoryId = null) {
  emit('create-habit', categoryId ? { category_id: categoryId } : null)
}

async function onDurationComplete(habitId) {
  const row = (habitRows.value || []).find((item) => item.habit.id === habitId)
  const fromActive = (props.api.activeHabits?.value || []).find((habit) => habit.id === habitId)
  const habit = row?.habit || fromActive
  if (!habit) return
  const ok = await props.api.logCheck(habitId, {
    value: habit.target_value != null ? Number(habit.target_value) : null,
    status: 'completed',
  })
  if (!ok && props.api.errorMessage.value) {
    emit('toast', { type: 'error', message: props.api.errorMessage.value })
    return
  }
  emit('toast', { type: 'success', message: `${habit.title} done` })
}

const durationTimer = useHabitDurationTimer({
  todayKey,
  onComplete: onDurationComplete,
})

function isDurationHabit(row) {
  return row?.habit?.habit_type === 'duration'
}

function isDurationRunning(row) {
  return durationTimer.isActiveFor(row.habit.id)
}

async function onToggle(row) {
  if (!row.dueToday) return

  // Duration: Start → countdown → auto complete (undo still uses toggle when checked)
  if (isDurationHabit(row) && !row.checkedToday) {
    if (isDurationRunning(row)) return
    if (durationTimer.isRunning.value && durationTimer.activeHabitId.value !== row.habit.id) {
      durationTimer.cancel()
    }
    durationTimer.start(row.habit)
    return
  }

  if (row.habit.habit_type === 'quantity' && !row.checkedToday) {
    openLogPanel(row)
    return
  }

  const ok = await props.api.toggleCheck(row.habit.id)
  if (!ok && props.api.errorMessage.value) {
    emit('toast', { type: 'error', message: props.api.errorMessage.value })
  }
}

function cancelDurationTimer() {
  durationTimer.cancel()
}

function openLogPanel(row, dateKey = null) {
  const key = dateKey || props.api.todayKey.value
  logPanel.value = row
  logDateKey.value = key
  const existing = (props.api.checks?.value || []).find(
    (check) => check.habit_id === row.habit.id && check.checked_on === key,
  )
  logValue.value =
    existing?.value != null
      ? Number(existing.value)
      : row.habit.target_value != null
        ? Number(row.habit.target_value)
        : 1
  logMood.value = existing?.mood ?? row.todayCheck?.mood ?? null
  logNote.value = existing?.journal_note || row.todayCheck?.journal_note || ''
}

function closeLogPanel() {
  logPanel.value = null
  logDateKey.value = null
}

function onHeatDayClick(cell) {
  const habit = focusHabit.value
  if (!habit || !cell?.due) return
  const row = (habitRows.value || []).find((item) => item.habit.id === habit.id)
  if (!row) return
  openLogPanel(row, cell.key)
}

async function submitLogPanel() {
  if (!logPanel.value) return
  const habit = logPanel.value.habit
  const dateKey = logDateKey.value || props.api.todayKey.value
  const ok = await props.api.logCheck(habit.id, {
    dateKey,
    value: habit.habit_type === 'boolean' ? null : Number(logValue.value),
    status: 'completed',
    mood: logMood.value,
    journal_note: logNote.value,
  })

  if (ok && logNote.value.trim()) {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (token) {
        const res = await fetch('/api/ai/habits/sentiment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text: logNote.value.trim() }),
        })
        if (res.ok) {
          const data = await res.json()
          if (data.sentiment) {
            await props.api.updateCheckMeta(habit.id, dateKey, {
              value: habit.habit_type === 'boolean' ? null : Number(logValue.value),
              status: 'completed',
              mood: logMood.value,
              journal_note: logNote.value,
              sentiment: data.sentiment,
            })
          }
        }
      }
    } catch {
      // sentiment is best-effort
    }
  }

  emit('toast', {
    type: ok ? 'success' : 'error',
    message: ok ? `Logged “${habit.title}”` : props.api.errorMessage.value || 'Could not log.',
  })
  if (ok) closeLogPanel()
}

async function onArchive(habit) {
  const confirmed = await confirmArchive('habit', habit.title)
  if (!confirmed) return
  const ok = await props.api.archiveHabit(habit.id)
  emit('toast', {
    type: ok ? 'success' : 'error',
    message: ok ? `Archived “${habit.title}”` : props.api.errorMessage.value || 'Could not archive habit.',
  })
}

async function onFreeze(habit) {
  const ok = await props.api.useStreakFreeze(habit.id)
  emit('toast', {
    type: ok ? 'success' : 'error',
    message: ok ? `Streak freeze used for “${habit.title}”` : props.api.errorMessage.value || 'Could not use freeze.',
  })
}

function shiftHeatMonth(delta) {
  const [year, month] = String(heatMonth.value).split('-').map(Number)
  const date = new Date(year, month - 1 + delta, 1)
  heatMonth.value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

async function enableNotifications() {
  const ok = await notifications.requestPermission()
  emit('toast', {
    type: ok ? 'success' : 'error',
    message: ok ? 'Browser notifications enabled.' : notifications.lastError.value || 'Notifications blocked.',
  })
}

onMounted(() => {
  notifications.startWatcher(() =>
    (habitRows.value || [])
      .filter((row) => row.reminderDue)
      .map((row) => row.habit),
  )
})

watch(
  reminderDueRows,
  (rows) => {
    if (rows.length) notifications.showHabitReminder(rows.map((r) => r.habit))
  },
  { deep: true },
)
</script>

<template>
  <div class="habits-view space-y-5">
    <p v-if="errorMessage" class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200">
      {{ errorMessage }}
    </p>

    <div v-if="isLoading" class="habits-panel rounded-2xl p-6 text-center text-sm text-slate-500 dark:text-slate-400">
      Loading habits...
    </div>

    <!-- TODAY -->
    <template v-else-if="showToday">
      <header class="habits-hero habits-hero--today rounded-3xl p-5 sm:p-6">
        <div class="habits-hero-today-grid">
          <div class="habits-hero-today-copy min-w-0">
            <p class="habits-kicker">Today’s check-ins</p>
            <h2 class="habits-hero-title mt-1">{{ todayLabel }}</h2>
            <p class="habits-hero-sub mt-2 text-sm text-slate-600 dark:text-slate-300">
              {{ dueTodayCount ? `${checkedDueCount} of ${dueTodayCount} habits checked in` : 'No habits scheduled today — add one to start a streak.' }}
            </p>
            <p class="mt-1 text-xs text-slate-500">New day unlocks at 4:00 AM · before then you’re still on yesterday.</p>
            <div class="habits-hero-today-chips mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
              <span class="habits-chip habits-chip--tiny">Lv {{ progress?.level || 1 }} · {{ progress?.xp || 0 }} XP</span>
              <span class="habits-chip habits-chip--tiny">{{ progress?.freeze_tokens ?? 0 }} freezes</span>
              <span v-if="offlinePending" class="habits-chip habits-chip--tiny habits-chip--warn">{{ offlinePending }} offline pending</span>
            </div>
          </div>

          <div class="habits-hero-today-actions">
            <div class="habits-progress-ring" :style="ringStyle" aria-hidden="true">
              <div class="habits-progress-ring__hole">
                <strong class="tabular-nums">{{ dayProgressPct }}%</strong>
                <span>done</span>
              </div>
            </div>
            <div class="habits-hero-today-btns">
              <button class="habits-primary-btn" type="button" @click="emit('create-habit')">
                <span class="habits-primary-btn__full">New habit</span>
                <span class="habits-primary-btn__short" aria-hidden="true">+ New</span>
              </button>
              <button
                class="habits-action-btn"
                type="button"
                :data-tooltip="notifyPermission === 'granted' ? 'Reminders enabled' : 'Enable reminders'"
                :aria-label="notifyPermission === 'granted' ? 'Reminders enabled' : 'Enable reminders'"
                @click="enableNotifications"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div
        v-if="reminderDueRows.length"
        class="habits-reminder-strip rounded-2xl px-4 py-3"
      >
        <p class="text-sm font-bold text-slate-900 dark:text-slate-100">
          Reminder due · {{ reminderDueRows.length }} habit{{ reminderDueRows.length === 1 ? '' : 's' }} waiting
        </p>
        <p class="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
          {{ reminderDueRows.map((row) => row.habit.title).join(', ') }}
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          class="habits-chip"
          :class="{ 'habits-chip--active': selectedCategoryId === 'all' }"
          type="button"
          @click="selectedCategoryId = 'all'"
        >
          All
        </button>
        <button
          v-for="category in categories"
          :key="category.id"
          class="habits-chip"
          :class="{ 'habits-chip--active': selectedCategoryId === category.id }"
          type="button"
          @click="selectedCategoryId = category.id"
        >
          {{ category.name }}
        </button>
      </div>

      <div v-if="!sortedRows.length" class="habits-empty rounded-3xl p-8 text-center">
        <svg class="mx-auto h-16 w-16 text-teal-500/80" viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <circle cx="32" cy="32" r="28" stroke="currentColor" stroke-width="3" opacity="0.35" />
          <path d="M20 33l8 8 16-18" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <p class="mt-4 text-xl font-extrabold text-slate-900 dark:text-slate-100">Build your first streak</p>
        <p class="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          Add a habit, check in daily, and watch consistency grow.
        </p>
        <button class="habits-primary-btn mt-5" type="button" @click="emit('create-habit')">
          Add your first habit
        </button>
      </div>

      <div v-else class="space-y-3 habit-today-list">
        <article
          v-for="row in sortedRows"
          :key="row.habit.id"
          class="habit-row"
          :class="{
            'habit-row--done': row.checkedToday,
            'habit-row--focus': focusHabitId === row.habit.id,
            'habit-row--skip': !row.dueToday,
          }"
          @click="focusHabitId = row.habit.id"
        >
          <div class="habit-row-main flex items-start gap-3">
            <div class="habit-check-wrap shrink-0">
              <button
                class="habit-check-circle"
                :class="{
                  'habit-check-circle--done': row.checkedToday,
                  'habit-check-circle--muted': !row.dueToday,
                  'habit-check-circle--start': isDurationHabit(row) && row.dueToday && !row.checkedToday && !isDurationRunning(row),
                  'habit-check-circle--timer': isDurationRunning(row),
                }"
                type="button"
                :aria-label="
                  row.checkedToday
                    ? `Undo check-in for ${row.habit.title}`
                    : isDurationRunning(row)
                      ? `Duration timer for ${row.habit.title}`
                      : isDurationHabit(row)
                        ? `Start ${row.habit.title}`
                        : `Check in ${row.habit.title}`
                "
                :disabled="!row.dueToday || isDurationRunning(row)"
                :style="{ '--habit-color': row.habit.color || 'var(--habit-done)' }"
                @click.stop="onToggle(row)"
              >
                <svg v-if="row.checkedToday" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                <span v-else-if="isDurationRunning(row)" class="habit-check-circle__timer tabular-nums">
                  {{ durationTimer.displayLabel }}
                </span>
                <span v-else-if="isDurationHabit(row) && row.dueToday" class="habit-check-circle__start">Start</span>
              </button>
              <button
                v-if="isDurationRunning(row)"
                class="habit-timer-cancel"
                type="button"
                aria-label="Cancel duration timer"
                @click.stop="cancelDurationTimer"
              >
                Cancel
              </button>
            </div>

            <div class="habit-row-body min-w-0 flex-1">
              <div class="habit-row-top flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-1.5">
                    <strong class="habit-row-title text-base font-extrabold text-slate-950 dark:text-slate-50">{{ row.habit.title }}</strong>
                    <span
                      v-if="row.category"
                      class="habits-chip habits-chip--tiny"
                      :style="{ background: `${row.category.color}22`, color: row.category.color, borderColor: `${row.category.color}44` }"
                    >
                      {{ row.category.name }}
                    </span>
                    <span v-if="row.reminderDue" class="habits-chip habits-chip--tiny habits-chip--warn">Reminder due</span>
                    <span v-if="row.atRisk" class="habits-chip habits-chip--tiny habits-chip--warn">At risk</span>
                    <span v-if="row.stackParent" class="habits-chip habits-chip--tiny">
                      After {{ row.stackParent.title }}{{ row.stackUnlocked ? '' : ' (locked)' }}
                    </span>
                  </div>
                  <p class="habit-row-meta mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {{ frequencyLabel(row.habit) }}
                    <span v-if="row.habit.habit_type === 'quantity'"> · Target {{ row.habit.target_value }} {{ row.habit.unit || '' }}</span>
                    <span v-else-if="row.habit.habit_type === 'duration'"> · {{ row.habit.target_value }} {{ row.habit.unit || 'mins' }}</span>
                    <span v-if="row.habit.reminder_time"> · Reminder {{ formatReminderTime(row.habit.reminder_time) }}</span>
                    <span v-if="!row.dueToday"> · Not due today</span>
                    <span v-else-if="row.checkedToday"> · Checked in</span>
                    <span v-else> · Due today</span>
                  </p>
                </div>

                <div class="habit-streak-badge shrink-0" title="Current streak">
                  <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2c2 4 0 6 0 6s4-1 6 3c2 4-1 9-6 11-5-2-8-7-6-11 2-4 6-3 6-3s-2-2 0-6Z" />
                  </svg>
                  <span class="tabular-nums">{{ row.streaks.current }}</span>
                  <small>day streak</small>
                </div>
              </div>

              <div class="habit-row-footer mt-3 flex flex-wrap items-center justify-between gap-2">
                <div class="habit-week-dots">
                  <span
                    v-for="day in row.week"
                    :key="day.key"
                    class="habit-week-dot"
                    :class="{
                      'habit-week-dot--checked': day.checked,
                      'habit-week-dot--missed': day.missed,
                      'habit-week-dot--today': day.isToday,
                      'habit-week-dot--skip': !day.due,
                    }"
                    :title="day.key"
                  />
                </div>

                <div class="habit-row-actions flex flex-wrap justify-end gap-1">
                  <button
                    class="habits-action-btn"
                    type="button"
                    data-tooltip="Mood & journal"
                    aria-label="Mood and journal"
                    @click.stop="openLogPanel(row)"
                  >
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                      <path d="M9 9h.01M15 9h.01" />
                    </svg>
                  </button>
                  <button
                    v-if="row.dueToday && !row.checkedToday"
                    class="habits-action-btn"
                    type="button"
                    data-tooltip="Use streak freeze"
                    aria-label="Use streak freeze"
                    @click.stop="onFreeze(row.habit)"
                  >
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9 4.9 19.1" />
                    </svg>
                  </button>
                  <button
                    class="habits-action-btn"
                    type="button"
                    data-tooltip="Edit habit"
                    aria-label="Edit habit"
                    @click.stop="emit('edit-habit', row.habit)"
                  >
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>
                  <button
                    class="habits-action-btn habits-action-btn--danger"
                    type="button"
                    data-tooltip="Archive"
                    aria-label="Archive habit"
                    @click.stop="onArchive(row.habit)"
                  >
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </template>

    <!-- INSIGHTS -->
    <template v-else-if="showInsights">
      <div class="habits-insights space-y-5">
      <header class="habits-hero habits-hero--insights rounded-3xl p-5 sm:p-6">
        <div class="habits-insights-hero-inner flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div class="min-w-0">
            <p class="habits-kicker">Consistency</p>
            <h2 class="habits-hero-title mt-1">Insights</h2>
            <p class="habits-hero-sub mt-2 text-sm text-slate-600 dark:text-slate-300">
              Heatmap, trends, mood correlation, and anomaly flags.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              class="habits-action-btn"
              type="button"
              data-tooltip="Export JSON"
              aria-label="Export JSON"
              @click="api.downloadExport('json')"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                <path d="M14 2v6h6" />
                <path d="M12 18v-6" />
                <path d="m9 15 3 3 3-3" />
              </svg>
            </button>
            <button
              class="habits-action-btn"
              type="button"
              data-tooltip="Export CSV"
              aria-label="Export CSV"
              @click="api.downloadExport('csv')"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M4 6h16M4 12h10M4 18h14" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div v-if="!sortedRows.length" class="habits-empty rounded-3xl p-8 text-center">
        <p class="text-lg font-extrabold text-slate-900 dark:text-slate-100">No insights yet</p>
        <p class="mt-2 text-sm text-slate-500">Create a habit first to see streaks and consistency.</p>
        <button class="habits-primary-btn mt-4" type="button" @click="emit('create-habit')">Add habit</button>
      </div>

      <template v-else>
        <div class="habits-insights-stats grid grid-cols-2 gap-3 sm:grid-cols-4">
          <article class="habits-stat-card habits-stat-card--streak rounded-2xl p-4">
            <p class="text-xs font-bold uppercase tracking-wide text-slate-500">Longest streak</p>
            <p class="mt-1 text-3xl font-black tabular-nums text-amber-700 dark:text-amber-300">{{ longestStreak }}</p>
          </article>
          <article class="habits-stat-card rounded-2xl p-4">
            <p class="text-xs font-bold uppercase tracking-wide text-slate-500">Active habits</p>
            <p class="mt-1 text-3xl font-black tabular-nums text-slate-900 dark:text-slate-100">{{ sortedRows.length }}</p>
          </article>
          <article class="habits-stat-card habits-stat-card--done rounded-2xl p-4">
            <p class="text-xs font-bold uppercase tracking-wide text-slate-500">This week</p>
            <p class="mt-1 text-3xl font-black tabular-nums text-emerald-600 dark:text-emerald-300">{{ thisWeekPct }}%</p>
          </article>
          <article class="habits-stat-card habits-stat-card--mood rounded-2xl p-4">
            <p class="text-xs font-bold uppercase tracking-wide text-slate-500">Level</p>
            <p class="mt-1 text-3xl font-black tabular-nums text-violet-700 dark:text-violet-300">{{ progress?.level || 1 }}</p>
            <p class="text-xs text-slate-500">{{ progress?.xp || 0 }} XP</p>
          </article>
        </div>

        <article v-if="unlockedBadges.length" class="habits-panel rounded-2xl p-4">
          <h3 class="mb-2 font-extrabold">Badges</h3>
          <div class="flex flex-wrap gap-2">
            <span v-for="badge in unlockedBadges" :key="badge" class="habits-chip">{{ badge }}</span>
          </div>
        </article>

        <article v-if="anomalies.length" class="habits-panel rounded-2xl border border-violet-300/40 p-4">
          <h3 class="mb-2 font-extrabold text-violet-800 dark:text-violet-200">Pattern shifts</h3>
          <ul class="space-y-1 text-sm text-slate-600 dark:text-slate-300">
            <li v-for="flag in anomalies" :key="flag.habitId">{{ flag.title }} — {{ flag.message }}</li>
          </ul>
        </article>

        <div class="habits-insights-heat-row grid gap-4 lg:grid-cols-2">
          <div class="habits-insights-heat-stack grid gap-4 content-start">
            <article class="habits-panel rounded-2xl p-4">
              <div class="mb-3 flex items-center justify-between gap-2">
                <div class="min-w-0">
                  <h3 class="font-extrabold text-slate-950 dark:text-slate-50">Month heat · {{ focusHabit?.title }}</h3>
                  <p class="text-xs text-slate-500">{{ heatMonthLabel }}</p>
                </div>
                <div class="flex shrink-0 gap-1">
                  <button class="habits-icon-btn" type="button" aria-label="Previous month" @click="shiftHeatMonth(-1)">‹</button>
                  <button class="habits-icon-btn" type="button" aria-label="Next month" @click="shiftHeatMonth(1)">›</button>
                </div>
              </div>
              <div class="mb-3 flex flex-wrap gap-2">
                <button
                  v-for="row in sortedRows"
                  :key="row.habit.id"
                  class="habits-chip"
                  :class="{ 'habits-chip--active': focusHabitId === row.habit.id }"
                  type="button"
                  @click="focusHabitId = row.habit.id"
                >
                  {{ row.habit.title }}
                </button>
              </div>
              <div class="habit-heat-grid">
                <button
                  v-for="cell in heatCells"
                  :key="cell.key"
                  class="habit-heat-cell"
                  :class="{
                    'habit-heat-cell--checked': cell.checked,
                    'habit-heat-cell--missed': cell.missed,
                    'habit-heat-cell--skip': !cell.due,
                  }"
                  type="button"
                  :title="cell.key"
                  :aria-label="`Log ${cell.key}`"
                  :disabled="!cell.due"
                  @click="onHeatDayClick(cell)"
                >
                  {{ cell.day }}
                </button>
              </div>
            </article>

            <article class="habits-panel rounded-2xl p-4">
              <div class="mb-3">
                <h3 class="font-extrabold text-slate-950 dark:text-slate-50">Habit ranking</h3>
                <p class="text-xs text-slate-500">Completion for {{ heatMonthLabel }}</p>
              </div>
              <p v-if="!monthRanking.length" class="text-sm text-slate-500">No due days yet this month.</p>
              <ul v-else class="habits-rank-list space-y-2.5">
                <li
                  v-for="(item, index) in monthRanking"
                  :key="item.id"
                  class="habits-rank-row"
                >
                  <button
                    class="habits-rank-btn"
                    type="button"
                    :class="{ 'habits-rank-btn--active': focusHabitId === item.id }"
                    @click="focusHabitId = item.id"
                  >
                    <span class="habits-rank-place tabular-nums">{{ index + 1 }}</span>
                    <span class="habits-rank-body min-w-0 flex-1">
                      <span class="habits-rank-title truncate">{{ item.title }}</span>
                      <span
                        class="habits-rank-bar"
                        role="progressbar"
                        :aria-valuenow="item.pct"
                        aria-valuemin="0"
                        aria-valuemax="100"
                        :aria-label="`${item.pct}% complete`"
                      >
                        <span
                          class="habits-rank-bar__fill"
                          :style="{ width: `${item.pct}%`, background: item.color }"
                        />
                      </span>
                      <span class="habits-rank-meta text-slate-500">
                        {{ item.done }}/{{ item.due }} · {{ item.streak }} streak
                      </span>
                    </span>
                    <strong class="habits-rank-pct tabular-nums">{{ item.pct }}%</strong>
                  </button>
                </li>
              </ul>
            </article>

            <article class="habits-panel rounded-2xl p-4">
              <div class="mb-3">
                <h3 class="font-extrabold text-slate-950 dark:text-slate-50">At risk</h3>
                <p class="text-xs text-slate-500">Habits likely to break streak today</p>
              </div>
              <p v-if="!atRiskInsights.length" class="text-sm text-slate-500">
                Looking steady — no high-risk habits right now.
              </p>
              <ul v-else class="habits-risk-list space-y-2">
                <li v-for="item in atRiskInsights" :key="item.id">
                  <button
                    class="habits-risk-row"
                    type="button"
                    @click="focusHabitId = item.id"
                  >
                    <span class="min-w-0 flex-1">
                      <strong class="block truncate text-slate-950 dark:text-slate-50">{{ item.title }}</strong>
                      <span class="text-xs text-slate-500">
                        {{ item.streak }}-day streak
                        <template v-if="item.dueToday && !item.checkedToday"> · still open today</template>
                      </span>
                    </span>
                    <span class="habits-risk-badge tabular-nums">{{ item.risk }}%</span>
                  </button>
                </li>
              </ul>
            </article>
          </div>

          <div class="habits-insights-trend-stack grid gap-4">
            <article class="habits-panel rounded-2xl p-4">
              <div class="mb-1">
                <h3 class="font-extrabold text-slate-950 dark:text-slate-50">Weekly completion</h3>
                <p class="text-xs text-slate-500">Live trend across the last 8 weeks</p>
              </div>
              <LiveTrendChart
                type="line"
                :items="historySeries"
                value-suffix="%"
                color="#0d9488"
                empty-label="Not enough habit history yet."
              />
            </article>
            <article class="habits-panel rounded-2xl p-4">
              <div class="mb-1">
                <h3 class="font-extrabold text-slate-950 dark:text-slate-50">Monthly trends</h3>
                <p class="text-xs text-slate-500">Live completion rate by month</p>
              </div>
              <LiveTrendChart
                type="bar"
                :items="monthlySeries"
                value-suffix="%"
                color="#059669"
                empty-label="Not enough monthly history yet."
              />
            </article>
            <article class="habits-panel rounded-2xl p-4">
              <div class="mb-1">
                <h3 class="font-extrabold text-slate-950 dark:text-slate-50">Mood vs weekday</h3>
                <p class="text-xs text-slate-500">Average mood from daily journals and check-ins</p>
              </div>
              <LiveTrendChart
                type="bar"
                :items="moodChartItems"
                value-key="value"
                value-suffix=""
                :max-value="5"
                color="#7c3aed"
                empty-label="Log mood on check-ins to see correlation."
                :height="200"
              />
            </article>
          </div>
        </div>
      </template>
      </div>
    </template>

    <!-- JOURNAL -->
    <template v-else-if="showJournal">
      <HabitJournalPanel :api="api" @toast="emit('toast', $event)" />
    </template>

    <!-- CATEGORIES -->
    <template v-else-if="showCategories">
      <header class="habits-hero rounded-3xl p-5 sm:p-6">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="habits-kicker">Organize</p>
            <h2 class="habits-hero-title mt-1">Categories</h2>
            <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Browse habits by group, then jump back to Today to check in.
            </p>
            <div class="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
              <span class="habits-chip habits-chip--tiny">{{ categoryHub.totals.categories }} categories</span>
              <span class="habits-chip habits-chip--tiny">{{ categoryHub.totals.habits }} habits</span>
              <span class="habits-chip habits-chip--tiny">{{ categoryHub.totals.uncategorized }} uncategorized</span>
            </div>
          </div>
          <button class="habits-primary-btn" type="button" @click="emit('manage-categories')">
            Manage categories
          </button>
        </div>
      </header>

      <div class="grid gap-3 sm:grid-cols-2">
        <article
          v-for="category in categoryHub.cards"
          :key="category.id"
          class="habits-category-card habits-category-card--hub rounded-2xl p-4"
          :style="{ '--category-accent': category.color || '#f59e0b' }"
        >
          <button
            class="flex w-full items-center gap-3 text-left"
            type="button"
            :aria-expanded="expandedCategoryId === category.id"
            @click="toggleCategoryExpand(category.id)"
          >
            <span class="h-10 w-10 shrink-0 rounded-2xl shadow-inner" :style="{ background: category.color || '#f59e0b' }"></span>
            <div class="min-w-0 flex-1">
              <strong class="block truncate text-slate-950 dark:text-slate-50">{{ category.name }}</strong>
              <p class="text-xs text-slate-500">
                {{ category.habitCount }} habit{{ category.habitCount === 1 ? '' : 's' }}
                <template v-if="category.dueToday">
                  · {{ category.doneToday }}/{{ category.dueToday }} due today
                </template>
                · {{ category.weekPct }}% week
              </p>
            </div>
            <svg
              class="h-4 w-4 shrink-0 text-slate-400 transition"
              :class="{ 'rotate-180': expandedCategoryId === category.id }"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          <div v-if="expandedCategoryId === category.id" class="mt-3 space-y-2 border-t border-slate-200/80 pt-3 dark:border-slate-700/80">
            <div v-if="!category.habits.length" class="rounded-xl bg-slate-50 px-3 py-3 text-center dark:bg-slate-900/60">
              <p class="text-sm text-slate-500">No habits here yet</p>
              <button class="habits-primary-btn mt-2" type="button" @click="createHabitInCategory(category.id)">
                Create habit
              </button>
            </div>
            <ul v-else class="space-y-1.5">
              <li
                v-for="item in category.habits"
                :key="item.id"
                class="flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-900/50"
              >
                <button class="min-w-0 flex-1 text-left" type="button" @click="emit('edit-habit', item.habit)">
                  <span class="block truncate text-sm font-bold text-slate-900 dark:text-slate-100">{{ item.title }}</span>
                  <span class="text-[0.7rem] text-slate-500">
                    {{ item.streak }} day streak
                    <template v-if="item.dueToday"> · {{ item.checkedToday ? 'done today' : 'due today' }}</template>
                  </span>
                </button>
              </li>
            </ul>
            <div class="flex flex-wrap gap-2 pt-1">
              <button class="habits-ghost-btn" type="button" @click="viewCategoryOnToday(category.id)">
                View on Today
              </button>
              <button class="habits-ghost-btn" type="button" @click="createHabitInCategory(category.id)">
                Add habit
              </button>
            </div>
          </div>
        </article>

        <article class="habits-category-card habits-category-card--hub rounded-2xl border-dashed p-4">
          <button
            class="flex w-full items-center gap-3 text-left"
            type="button"
            :aria-expanded="expandedCategoryId === 'none'"
            @click="toggleCategoryExpand('none')"
          >
            <span class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800">?</span>
            <div class="min-w-0 flex-1">
              <strong class="block text-slate-950 dark:text-slate-50">Uncategorized</strong>
              <p class="text-xs text-slate-500">
                {{ categoryHub.uncategorized }} habit{{ categoryHub.uncategorized === 1 ? '' : 's' }}
                <template v-if="categoryHub.uncategorizedPulse.dueToday">
                  · {{ categoryHub.uncategorizedPulse.doneToday }}/{{ categoryHub.uncategorizedPulse.dueToday }} due today
                </template>
              </p>
            </div>
            <svg
              class="h-4 w-4 shrink-0 text-slate-400 transition"
              :class="{ 'rotate-180': expandedCategoryId === 'none' }"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          <div v-if="expandedCategoryId === 'none'" class="mt-3 space-y-2 border-t border-slate-200/80 pt-3 dark:border-slate-700/80">
            <div v-if="!categoryHub.uncategorizedHabits.length" class="px-1 py-2 text-sm text-slate-500">
              All habits have a category.
            </div>
            <ul v-else class="space-y-1.5">
              <li
                v-for="item in categoryHub.uncategorizedHabits"
                :key="item.id"
                class="flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-900/50"
              >
                <button class="min-w-0 flex-1 text-left" type="button" @click="emit('edit-habit', item.habit)">
                  <span class="block truncate text-sm font-bold text-slate-900 dark:text-slate-100">{{ item.title }}</span>
                  <span class="text-[0.7rem] text-slate-500">Edit to assign a category</span>
                </button>
              </li>
            </ul>
            <div class="flex flex-wrap gap-2 pt-1">
              <button class="habits-ghost-btn" type="button" @click="viewCategoryOnToday('none')">
                View on Today
              </button>
              <button class="habits-ghost-btn" type="button" @click="createHabitInCategory(null)">
                Add habit
              </button>
            </div>
          </div>
        </article>
      </div>
    </template>

    <!-- Log / mood modal -->
    <Teleport to="body">
      <div
        v-if="logPanel"
        class="habit-modal-backdrop"
        role="presentation"
        @click.self="closeLogPanel"
      >
        <form
          class="habit-modal-panel habit-modal-panel--sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="habit-log-title"
          @submit.prevent="submitLogPanel"
        >
          <div class="habit-modal-handle" aria-hidden="true"></div>
          <header class="habit-modal-header">
            <div class="min-w-0">
              <p class="habits-kicker">Check-in</p>
              <h3 id="habit-log-title" class="habit-modal-title">{{ logPanel.habit.title }}</h3>
              <p class="habit-modal-subtitle">
                Log value, mood, and an optional journal note
                <span v-if="logDateKey"> · {{ logDateKey }}</span>.
              </p>
            </div>
            <button class="habit-modal-close" type="button" aria-label="Close" @click="closeLogPanel">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </header>

          <div class="habit-modal-body space-y-4">
            <div v-if="logPanel.habit.habit_type !== 'boolean'" class="habit-modal-section">
              <label class="habit-modal-label" for="log-value">
                {{ logPanel.habit.habit_type === 'duration' ? 'Minutes' : 'Amount' }}
                <span v-if="logPanel.habit.unit">({{ logPanel.habit.unit }})</span>
              </label>
              <input id="log-value" v-model.number="logValue" class="habit-modal-input" type="number" min="0" step="1" />
            </div>

            <div class="habit-modal-section">
              <p class="habit-modal-label">Mood (1–5)</p>
              <div class="habit-chip-row">
                <button
                  v-for="n in 5"
                  :key="n"
                  class="habit-day-btn"
                  :class="{ 'habit-day-btn--active': logMood === n }"
                  type="button"
                  :aria-pressed="logMood === n"
                  @click="logMood = n"
                >
                  {{ n }}
                </button>
              </div>
            </div>

            <div class="habit-modal-section">
              <label class="habit-modal-label" for="log-note">Journal note</label>
              <textarea id="log-note" v-model="logNote" class="habit-modal-textarea" rows="3" placeholder="How did it go?" />
            </div>
          </div>

          <footer class="habit-modal-footer">
            <button class="habit-modal-secondary" type="button" @click="closeLogPanel">Cancel</button>
            <button class="habits-primary-btn" type="submit">Save log</button>
          </footer>
        </form>
      </div>
    </Teleport>

    <HabitAiPanel
      :api="api"
      @toast="emit('toast', $event)"
      @create-from-suggestion="emit('create-from-suggestion', $event)"
    />
  </div>
</template>
