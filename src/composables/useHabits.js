import { computed, ref, watch } from 'vue'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { habitDayKey, localDateKey } from '../lib/localDate'
import { enqueueHabitCheck, flushHabitOfflineQueue, isOnline } from './habitOfflineQueue'

export { habitDayKey, localDateKey } from '../lib/localDate'

const DEFAULT_HABIT_CATEGORIES = [
  { name: 'Health', color: '#10b981', position: 0 },
  { name: 'Focus', color: '#6366f1', position: 1 },
  { name: 'Lifestyle', color: '#f59e0b', position: 2 },
]

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const XP_PER_LEVEL = 100
const BADGE_DEFS = [
  { id: 'first_check', label: 'First check-in', test: (ctx) => ctx.totalCompletions >= 1 },
  { id: 'streak_7', label: '7-day streak', test: (ctx) => ctx.bestStreak >= 7 },
  { id: 'streak_30', label: '30-day streak', test: (ctx) => ctx.bestStreak >= 30 },
  { id: 'quantity_pro', label: 'Quantity habit', test: (ctx) => ctx.hasQuantity },
  { id: 'level_5', label: 'Level 5', test: (ctx) => ctx.level >= 5 },
  { id: 'freeze_saver', label: 'Used a freeze', test: (ctx) => ctx.freezeUsed },
]

export function parseLocalDate(key) {
  const [year, month, day] = String(key).split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function shiftDateKey(key, days) {
  const date = parseLocalDate(key)
  date.setDate(date.getDate() + days)
  return localDateKey(date)
}

function weekStartKey(dateKey) {
  const date = parseLocalDate(dateKey)
  date.setDate(date.getDate() - date.getDay())
  return localDateKey(date)
}

function daysBetween(aKey, bKey) {
  const a = parseLocalDate(aKey).getTime()
  const b = parseLocalDate(bKey).getTime()
  return Math.round((b - a) / 86400000)
}

function isCompletedCheck(check) {
  if (!check) return false
  if (check.status === 'skipped') return false
  return check.status === 'completed' || check.status === 'partial' || !check.status
}

export function isHabitDueOn(habit, dateKey, checksByHabit = null) {
  if (!habit) return false
  const frequency = habit.frequency || 'daily'

  if (frequency === 'daily') return true

  if (frequency === 'weekly' || frequency === 'custom_days') {
    const days = Array.isArray(habit.target_days) ? habit.target_days : []
    if (!days.length) return true
    return days.includes(parseLocalDate(dateKey).getDay())
  }

  if (frequency === 'times_per_week') {
    const target = Number(habit.times_per_week) || 3
    if (!checksByHabit) return true
    const set = checksByHabit.get(habit.id)
    const start = weekStartKey(dateKey)
    let count = 0
    for (let i = 0; i < 7; i += 1) {
      const key = shiftDateKey(start, i)
      if (key > dateKey) break
      if (set?.has(key)) count += 1
    }
    // Due until weekly target met (today counts if not yet done)
    const doneExcludingToday = set?.has(dateKey) ? count - 1 : count
    return doneExcludingToday < target
  }

  if (frequency === 'every_n_days') {
    const interval = Math.max(1, Number(habit.interval_days) || 2)
    if (!checksByHabit) return true
    const set = checksByHabit.get(habit.id)
    if (!set || !set.size) {
      const created = habit.created_at ? localDateKey(new Date(habit.created_at)) : dateKey
      return daysBetween(created, dateKey) % interval === 0
    }
    const sorted = [...set].sort()
    const last = sorted.filter((key) => key <= dateKey).pop()
    if (!last) return true
    if (last === dateKey) return true
    return daysBetween(last, dateKey) >= interval
  }

  return true
}

export function formatReminderTime(value) {
  if (!value) return ''
  const raw = String(value).slice(0, 5)
  const [hours, minutes] = raw.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return raw
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date)
}

export function frequencyLabel(habit) {
  if (!habit) return 'Habit'
  switch (habit.frequency) {
    case 'weekly':
    case 'custom_days':
      return 'Custom days'
    case 'times_per_week':
      return `${habit.times_per_week || 3}× / week`
    case 'every_n_days':
      return `Every ${habit.interval_days || 2} days`
    default:
      return 'Daily'
  }
}

function reminderPassedToday(reminderTime, now = new Date()) {
  if (!reminderTime) return false
  const raw = String(reminderTime).slice(0, 5)
  const [hours, minutes] = raw.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return false
  const reminder = new Date(now)
  reminder.setHours(hours, minutes, 0, 0)
  return now >= reminder
}

function buildCheckMaps(checks) {
  const dateSets = new Map()
  const byHabitDate = new Map()
  for (const check of checks) {
    if (!isCompletedCheck(check)) continue
    if (!dateSets.has(check.habit_id)) dateSets.set(check.habit_id, new Set())
    dateSets.get(check.habit_id).add(check.checked_on)
    byHabitDate.set(`${check.habit_id}:${check.checked_on}`, check)
  }
  return { dateSets, byHabitDate }
}

function buildFreezeMap(freezes) {
  const map = new Map()
  for (const freeze of freezes) {
    if (!map.has(freeze.habit_id)) map.set(freeze.habit_id, new Set())
    map.get(freeze.habit_id).add(freeze.used_on)
  }
  return map
}

export function computeStreak(habit, checkSet, freezeSet = new Set(), todayKey = localDateKey()) {
  if (!habit) return { current: 0, best: 0 }

  const covered = (key) => checkSet.has(key) || freezeSet.has(key)
  const dueFn = (key) => isHabitDueOn(habit, key, new Map([[habit.id, checkSet]]))

  let current = 0
  let cursor = todayKey

  if (!covered(todayKey) && dueFn(todayKey)) {
    cursor = shiftDateKey(todayKey, -1)
  }

  while (true) {
    if (!dueFn(cursor)) {
      cursor = shiftDateKey(cursor, -1)
      continue
    }
    if (!covered(cursor)) break
    current += 1
    cursor = shiftDateKey(cursor, -1)
    if (current > 366) break
  }

  const sorted = [...new Set([...checkSet, ...freezeSet])].sort()
  let best = 0
  let run = 0
  let prev = null

  for (const key of sorted) {
    if (!dueFn(key)) continue
    if (prev) {
      let expected = shiftDateKey(prev, 1)
      while (!dueFn(expected) && expected < key) {
        expected = shiftDateKey(expected, 1)
      }
      run = expected === key ? run + 1 : 1
    } else {
      run = 1
    }
    best = Math.max(best, run)
    prev = key
  }

  return { current, best: Math.max(best, current) }
}

export function weekStrip(habit, checkSet, todayKey = localDateKey(), checksByHabit = null) {
  return Array.from({ length: 7 }, (_, index) => {
    const key = shiftDateKey(todayKey, index - 6)
    const due = isHabitDueOn(habit, key, checksByHabit)
    const checked = checkSet.has(key)
    return {
      key,
      label: WEEKDAY_LABELS[parseLocalDate(key).getDay()],
      due,
      checked,
      isToday: key === todayKey,
      missed: due && !checked && key < todayKey,
    }
  })
}

export function monthHeat(habit, checkSet, monthDate = new Date(), checksByHabit = null, todayKey = localDateKey()) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []

  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = localDateKey(new Date(year, month, day))
    const due = isHabitDueOn(habit, key, checksByHabit)
    const checked = checkSet.has(key)
    cells.push({
      key,
      day,
      due,
      checked,
      missed: due && !checked && key < todayKey,
    })
  }

  return cells
}

/** Completion rate for a habit within a YYYY-MM month (through today if current month). */
export function monthCompletionForHabit(
  habit,
  checkSet,
  monthKey,
  todayKey = localDateKey(),
  checksByHabit = null,
) {
  if (!habit || !monthKey) return { due: 0, done: 0, pct: 0 }
  const [year, month] = monthKey.split('-').map(Number)
  const cells = monthHeat(habit, checkSet, new Date(year, month - 1, 1), checksByHabit, todayKey)
  const endKey =
    monthKey === String(todayKey).slice(0, 7)
      ? todayKey
      : localDateKey(new Date(year, month, 0))

  let due = 0
  let done = 0
  for (const cell of cells) {
    if (cell.key > endKey) continue
    if (!cell.due) continue
    due += 1
    if (cell.checked) done += 1
  }

  return {
    due,
    done,
    pct: due ? Math.round((done / due) * 100) : 0,
  }
}

export function weeklyCompletionSeries(habits, checksByHabit, weeks = 8, todayKey = localDateKey()) {
  const series = []

  for (let weekIndex = weeks - 1; weekIndex >= 0; weekIndex -= 1) {
    const endKey = shiftDateKey(todayKey, -weekIndex * 7)
    const startKey = shiftDateKey(endKey, -6)
    let due = 0
    let done = 0

    for (const habit of habits) {
      const set = checksByHabit.get(habit.id) || new Set()
      for (let offset = 0; offset < 7; offset += 1) {
        const key = shiftDateKey(startKey, offset)
        if (!isHabitDueOn(habit, key, checksByHabit)) continue
        due += 1
        if (set.has(key)) done += 1
      }
    }

    series.push({
      label: new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(parseLocalDate(startKey)),
      value: due ? Math.round((done / due) * 100) : 0,
      color: '#0d9488',
      sublabel: `${done}/${due} checks · week of ${startKey}`,
    })
  }

  return series
}

export function monthlyCompletionSeries(habits, checksByHabit, months = 6, todayKey = localDateKey()) {
  const series = []
  const today = parseLocalDate(todayKey)

  for (let i = months - 1; i >= 0; i -= 1) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    let due = 0
    let done = 0

    for (let day = 1; day <= daysInMonth; day += 1) {
      const key = localDateKey(new Date(year, month, day))
      if (key > todayKey) break
      for (const habit of habits) {
        const set = checksByHabit.get(habit.id) || new Set()
        if (!isHabitDueOn(habit, key, checksByHabit)) continue
        due += 1
        if (set.has(key)) done += 1
      }
    }

    series.push({
      label: new Intl.DateTimeFormat(undefined, { month: 'short' }).format(monthDate),
      value: due ? Math.round((done / due) * 100) : 0,
      color: '#059669',
      sublabel: `${done}/${due} checks`,
    })
  }

  return series
}

/** Heuristic streak-risk score 0–1 (higher = more likely to miss). */
export function computeStreakRisk(habit, checkSet, todayKey = localDateKey()) {
  if (!habit) return 0
  const checksByHabit = new Map([[habit.id, checkSet]])
  if (!isHabitDueOn(habit, todayKey, checksByHabit)) return 0
  if (checkSet.has(todayKey)) return 0

  let due = 0
  let done = 0
  let weekdayMisses = 0
  const weekday = parseLocalDate(todayKey).getDay()

  for (let i = 1; i <= 28; i += 1) {
    const key = shiftDateKey(todayKey, -i)
    if (!isHabitDueOn(habit, key, checksByHabit)) continue
    due += 1
    if (checkSet.has(key)) done += 1
    else if (parseLocalDate(key).getDay() === weekday) weekdayMisses += 1
  }

  const missRate = due ? 1 - done / due : 0.4
  const recentMisses = [1, 2, 3].filter((i) => {
    const key = shiftDateKey(todayKey, -i)
    return isHabitDueOn(habit, key, checksByHabit) && !checkSet.has(key)
  }).length
  const weekdayFactor = Math.min(1, weekdayMisses / 4)
  return Math.min(1, missRate * 0.5 + recentMisses * 0.15 + weekdayFactor * 0.2)
}

export function detectAnomalies(habits, checksByHabit, todayKey = localDateKey()) {
  const flags = []
  for (const habit of habits) {
    const set = checksByHabit.get(habit.id) || new Set()
    let recentDue = 0
    let recentDone = 0
    let baseDue = 0
    let baseDone = 0

    for (let i = 0; i < 7; i += 1) {
      const key = shiftDateKey(todayKey, -i)
      if (!isHabitDueOn(habit, key, checksByHabit)) continue
      recentDue += 1
      if (set.has(key)) recentDone += 1
    }
    for (let i = 7; i < 35; i += 1) {
      const key = shiftDateKey(todayKey, -i)
      if (!isHabitDueOn(habit, key, checksByHabit)) continue
      baseDue += 1
      if (set.has(key)) baseDone += 1
    }

    if (baseDue < 4 || recentDue < 2) continue
    const recentRate = recentDone / recentDue
    const baseRate = baseDone / baseDue
    if (baseRate - recentRate >= 0.35) {
      flags.push({
        habitId: habit.id,
        title: habit.title,
        message: `Completion dropped vs last 4 weeks (${Math.round(recentRate * 100)}% vs ${Math.round(baseRate * 100)}%).`,
      })
    }
  }
  return flags
}

export function moodCorrelation(checks, habits, journals = []) {
  const byWeekday = Array.from({ length: 7 }, (_, day) => ({
    day,
    label: WEEKDAY_LABELS[day],
    moods: [],
    completions: 0,
    dueProxy: 0,
  }))

  for (const check of checks || []) {
    if (check.mood == null) continue
    const day = parseLocalDate(check.checked_on).getDay()
    byWeekday[day].moods.push(Number(check.mood))
    if (isCompletedCheck(check)) byWeekday[day].completions += 1
  }

  for (const journal of journals || []) {
    if (journal.mood == null || !journal.journal_on) continue
    const day = parseLocalDate(journal.journal_on).getDay()
    byWeekday[day].moods.push(Number(journal.mood))
  }

  return byWeekday.map((row) => ({
    label: row.label,
    avgMood: row.moods.length
      ? Math.round((row.moods.reduce((a, b) => a + b, 0) / row.moods.length) * 10) / 10
      : 0,
    moodLogs: row.moods.length,
    completions: row.completions,
  }))
}

function levelFromXp(xp) {
  return Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1)
}

function normalizeHabitPayload(payload) {
  const frequency = payload.frequency || 'daily'
  const habitType = payload.habit_type || 'boolean'
  const usesDays = frequency === 'weekly' || frequency === 'custom_days'

  return {
    title: payload.title?.trim(),
    color: payload.color || '#10b981',
    notes: payload.notes?.trim() || null,
    category_id: payload.category_id || null,
    habit_type: habitType,
    target_value: habitType === 'boolean' ? null : Number(payload.target_value) || null,
    unit: habitType === 'boolean' ? null : payload.unit?.trim() || (habitType === 'duration' ? 'mins' : null),
    frequency,
    target_days: usesDays ? payload.target_days || [] : null,
    times_per_week: frequency === 'times_per_week' ? Number(payload.times_per_week) || 3 : null,
    interval_days: frequency === 'every_n_days' ? Number(payload.interval_days) || 2 : null,
    reminder_time: payload.reminder_time || null,
    stack_after_habit_id: payload.stack_after_habit_id || null,
    xp_reward: payload.xp_reward != null ? Number(payload.xp_reward) : 10,
  }
}

export function exportHabitsJson(habits, checks, categories) {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      categories,
      habits,
      checks,
    },
    null,
    2,
  )
}

export function exportHabitsCsv(habits, checks) {
  const habitMap = new Map(habits.map((h) => [h.id, h]))
  const header = ['checked_on', 'habit_id', 'habit_title', 'status', 'value', 'mood', 'journal_note']
  const lines = [header.join(',')]
  for (const check of [...checks].sort((a, b) => String(a.checked_on).localeCompare(String(b.checked_on)))) {
    const habit = habitMap.get(check.habit_id)
    const cells = [
      check.checked_on,
      check.habit_id,
      JSON.stringify(habit?.title || ''),
      check.status || 'completed',
      check.value ?? '',
      check.mood ?? '',
      JSON.stringify(check.journal_note || ''),
    ]
    lines.push(cells.join(','))
  }
  return lines.join('\n')
}

export const JOURNAL_PROMPTS = [
  {
    key: 'keep_doing',
    label: 'Keep for tomorrow',
    hint: 'Ano ang gusto mong ulitin bukas?',
    placeholder: '1–2 sentences…',
  },
  {
    key: 'avoid_doing',
    label: 'Cut for tomorrow',
    hint: 'Ano ang ayaw mong ulitin?',
    placeholder: '1–2 sentences…',
  },
  {
    key: 'win',
    label: 'Win / thankful',
    hint: 'Isang panalo o pinapasalamatan mo ngayon?',
    placeholder: '1–2 sentences…',
  },
  {
    key: 'tomorrow_focus',
    label: 'Bukas focus',
    hint: 'Isang bagay na i-fofocus mo bukas?',
    placeholder: '1–2 sentences…',
  },
]

export function emptyDailyJournal(journalOn = habitDayKey()) {
  return {
    id: null,
    journal_on: journalOn,
    keep_doing: '',
    avoid_doing: '',
    win: '',
    tomorrow_focus: '',
    mood: null,
  }
}

export function journalFilledCount(entry) {
  if (!entry) return 0
  let count = 0
  if (String(entry.keep_doing || '').trim()) count += 1
  if (String(entry.avoid_doing || '').trim()) count += 1
  if (String(entry.win || '').trim()) count += 1
  if (String(entry.tomorrow_focus || '').trim()) count += 1
  if (entry.mood != null) count += 1
  return count
}

export { WEEKDAY_LABELS, XP_PER_LEVEL }

const dayTick = ref(0)
let dayTickerStarted = false

function ensureHabitDayTicker() {
  if (dayTickerStarted || typeof window === 'undefined') return
  dayTickerStarted = true
  const bump = () => {
    dayTick.value += 1
  }
  window.setInterval(bump, 60_000)
  window.addEventListener('focus', bump)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') bump()
  })
}

export function useHabits(user) {
  ensureHabitDayTicker()

  const categories = ref([])
  const habits = ref([])
  const checks = ref([])
  const freezes = ref([])
  const dailyJournals = ref([])
  const progress = ref({ xp: 0, level: 1, freeze_tokens: 2, badges: [] })
  const isLoading = ref(false)
  const isSaving = ref(false)
  const errorMessage = ref('')
  const selectedCategoryId = ref('all')
  const focusHabitId = ref(null)
  const heatMonth = ref(localDateKey(new Date()).slice(0, 7))
  const offlinePending = ref(0)

  const userId = computed(() => user.value?.id)
  const todayKey = computed(() => {
    void dayTick.value
    return habitDayKey()
  })
  const checkMaps = computed(() => buildCheckMaps(checks.value))
  const checksByHabit = computed(() => checkMaps.value.dateSets)
  const freezesByHabit = computed(() => buildFreezeMap(freezes.value))

  const activeHabits = computed(() =>
    habits.value
      .filter((habit) => !habit.is_archived)
      .sort((a, b) => a.title.localeCompare(b.title)),
  )

  const filteredHabits = computed(() => {
    if (selectedCategoryId.value === 'all') return activeHabits.value
    if (selectedCategoryId.value === 'none') {
      return activeHabits.value.filter((habit) => !habit.category_id)
    }
    return activeHabits.value.filter((habit) => habit.category_id === selectedCategoryId.value)
  })

  const focusHabit = computed(() => {
    if (focusHabitId.value) {
      return activeHabits.value.find((habit) => habit.id === focusHabitId.value) || filteredHabits.value[0] || null
    }
    return filteredHabits.value[0] || null
  })

  const habitRows = computed(() =>
    filteredHabits.value.map((habit) => {
      const set = checksByHabit.value.get(habit.id) || new Set()
      const freezeSet = freezesByHabit.value.get(habit.id) || new Set()
      const streaks = computeStreak(habit, set, freezeSet, todayKey.value)
      const checkedToday = set.has(todayKey.value)
      const dueToday = isHabitDueOn(habit, todayKey.value, checksByHabit.value)
      const todayCheck = checkMaps.value.byHabitDate.get(`${habit.id}:${todayKey.value}`) || null
      const reminderDue =
        Boolean(habit.reminder_time) &&
        dueToday &&
        !checkedToday &&
        reminderPassedToday(habit.reminder_time)
      const risk = computeStreakRisk(habit, set, todayKey.value)
      const stackParent = habit.stack_after_habit_id
        ? activeHabits.value.find((item) => item.id === habit.stack_after_habit_id) || null
        : null
      const parentDone = stackParent
        ? (checksByHabit.value.get(stackParent.id) || new Set()).has(todayKey.value)
        : true

      return {
        habit,
        checkedToday,
        dueToday,
        reminderDue,
        streaks,
        week: weekStrip(habit, set, todayKey.value, checksByHabit.value),
        category: categories.value.find((item) => item.id === habit.category_id) || null,
        todayCheck,
        risk,
        atRisk: risk >= 0.55 && dueToday && !checkedToday,
        stackParent,
        stackUnlocked: parentDone,
        progressValue: todayCheck?.value ?? null,
        targetValue: habit.target_value,
      }
    }),
  )

  const heatCells = computed(() => {
    if (!focusHabit.value) return []
    const set = checksByHabit.value.get(focusHabit.value.id) || new Set()
    const [year, month] = heatMonth.value.split('-').map(Number)
    return monthHeat(focusHabit.value, set, new Date(year, month - 1, 1), checksByHabit.value, todayKey.value)
  })

  const historySeries = computed(() =>
    weeklyCompletionSeries(filteredHabits.value, checksByHabit.value, 8, todayKey.value),
  )

  const monthlySeries = computed(() =>
    monthlyCompletionSeries(filteredHabits.value, checksByHabit.value, 6, todayKey.value),
  )

  const anomalies = computed(() => detectAnomalies(filteredHabits.value, checksByHabit.value, todayKey.value))

  const todayJournal = computed(() => {
    const found = dailyJournals.value.find((row) => row.journal_on === todayKey.value)
    return found || emptyDailyJournal(todayKey.value)
  })

  const journalFeed = computed(() =>
    [...dailyJournals.value].sort((a, b) => String(b.journal_on).localeCompare(String(a.journal_on))),
  )

  const checkInJournalEntries = computed(() => {
    const habitMap = new Map(habits.value.map((habit) => [habit.id, habit]))
    return checks.value
      .filter((check) => check.mood != null || String(check.journal_note || '').trim())
      .map((check) => {
        const habit = habitMap.get(check.habit_id)
        return {
          id: check.id,
          dateKey: check.checked_on,
          habitId: check.habit_id,
          habitTitle: habit?.title || 'Habit',
          habitColor: habit?.color || '#0d9488',
          mood: check.mood,
          note: check.journal_note || '',
          sentiment: check.sentiment || null,
        }
      })
      .sort((a, b) => String(b.dateKey).localeCompare(String(a.dateKey)))
  })

  const moodSeries = computed(() =>
    moodCorrelation(checks.value, filteredHabits.value, dailyJournals.value),
  )

  async function ensureDefaultCategories() {
    if (!userId.value || categories.value.length) return

    const rows = DEFAULT_HABIT_CATEGORIES.map((item) => ({
      user_id: userId.value,
      ...item,
    }))

    const { data, error } = await supabase.from('habit_categories').insert(rows).select()
    if (error) {
      errorMessage.value = error.message
      return
    }
    categories.value = data ?? []
  }

  async function ensureProgress() {
    if (!userId.value) return
    const { data, error } = await supabase
      .from('habit_user_progress')
      .select('*')
      .eq('user_id', userId.value)
      .maybeSingle()

    if (error) {
      // Table may not exist yet before migration
      return
    }

    if (data) {
      progress.value = {
        xp: data.xp || 0,
        level: data.level || 1,
        freeze_tokens: data.freeze_tokens ?? 2,
        badges: Array.isArray(data.badges) ? data.badges : [],
      }
      return
    }

    const { data: created } = await supabase
      .from('habit_user_progress')
      .insert({ user_id: userId.value, xp: 0, level: 1, freeze_tokens: 2, badges: [] })
      .select()
      .single()

    if (created) {
      progress.value = {
        xp: created.xp,
        level: created.level,
        freeze_tokens: created.freeze_tokens,
        badges: created.badges || [],
      }
    }
  }

  async function fetchHabits() {
    if (!userId.value || !isSupabaseConfigured) {
      categories.value = []
      habits.value = []
      checks.value = []
      freezes.value = []
      dailyJournals.value = []
      return
    }

    isLoading.value = true
    errorMessage.value = ''

    const since = shiftDateKey(todayKey.value, -370)

    const [categoryResult, habitResult, checkResult, freezeResult, journalResult] = await Promise.all([
      supabase.from('habit_categories').select('*').eq('user_id', userId.value).order('position'),
      supabase.from('habits').select('*').eq('user_id', userId.value).order('created_at', { ascending: false }),
      supabase
        .from('habit_checks')
        .select('*')
        .eq('user_id', userId.value)
        .gte('checked_on', since)
        .order('checked_on', { ascending: false }),
      supabase
        .from('habit_freezes')
        .select('*')
        .eq('user_id', userId.value)
        .gte('used_on', since),
      supabase
        .from('habit_daily_journals')
        .select('*')
        .eq('user_id', userId.value)
        .gte('journal_on', since)
        .order('journal_on', { ascending: false }),
    ])

    if (categoryResult.error || habitResult.error || checkResult.error) {
      errorMessage.value =
        categoryResult.error?.message ||
        habitResult.error?.message ||
        checkResult.error?.message ||
        'Failed to load habits.'
      isLoading.value = false
      return
    }

    categories.value = categoryResult.data ?? []
    habits.value = habitResult.data ?? []
    checks.value = checkResult.data ?? []
    freezes.value = freezeResult.error ? [] : freezeResult.data ?? []
    dailyJournals.value = journalResult.error ? [] : journalResult.data ?? []

    await ensureDefaultCategories()
    await ensureProgress()

    if (!focusHabitId.value && activeHabits.value[0]) {
      focusHabitId.value = activeHabits.value[0].id
    }

    isLoading.value = false

    if (isOnline()) {
      const flushed = await flushHabitOfflineQueue(supabase, userId.value)
      offlinePending.value = flushed.remaining
      if (flushed.applied > 0) await fetchHabits()
    }
  }

  function getDailyJournal(dateKey) {
    const key = dateKey || todayKey.value
    return dailyJournals.value.find((row) => row.journal_on === key) || emptyDailyJournal(key)
  }

  async function saveDailyJournal(payload) {
    if (!userId.value) return false
    const journalOn = payload.journal_on || todayKey.value
    if (!/^\d{4}-\d{2}-\d{2}$/.test(journalOn)) {
      errorMessage.value = 'Invalid journal date.'
      return false
    }

    errorMessage.value = ''
    isSaving.value = true

    const body = {
      user_id: userId.value,
      journal_on: journalOn,
      keep_doing: String(payload.keep_doing || '').trim() || null,
      avoid_doing: String(payload.avoid_doing || '').trim() || null,
      win: String(payload.win || '').trim() || null,
      tomorrow_focus: String(payload.tomorrow_focus || '').trim() || null,
      mood: payload.mood == null || payload.mood === '' ? null : Number(payload.mood),
    }

    if (body.mood != null && (Number.isNaN(body.mood) || body.mood < 1 || body.mood > 5)) {
      errorMessage.value = 'Mood must be between 1 and 5.'
      isSaving.value = false
      return false
    }

    const { data, error } = await supabase
      .from('habit_daily_journals')
      .upsert(body, { onConflict: 'user_id,journal_on' })
      .select()
      .single()

    isSaving.value = false

    if (error) {
      errorMessage.value = error.message
      return false
    }

    const next = dailyJournals.value.filter((row) => row.journal_on !== journalOn)
    dailyJournals.value = [data, ...next].sort((a, b) =>
      String(b.journal_on).localeCompare(String(a.journal_on)),
    )
    return true
  }

  async function createCategory(payload) {
    if (!userId.value || !payload.name?.trim()) return false
    errorMessage.value = ''

    const { data, error } = await supabase
      .from('habit_categories')
      .insert({
        user_id: userId.value,
        name: payload.name.trim(),
        color: payload.color || '#f59e0b',
        position: categories.value.length,
      })
      .select()
      .single()

    if (error) {
      errorMessage.value = error.message
      return false
    }

    categories.value = [...categories.value, data]
    return true
  }

  async function updateCategory(id, payload) {
    if (!userId.value || !id) return false
    errorMessage.value = ''

    const { data, error } = await supabase
      .from('habit_categories')
      .update({
        name: payload.name?.trim(),
        color: payload.color,
      })
      .eq('id', id)
      .eq('user_id', userId.value)
      .select()
      .single()

    if (error) {
      errorMessage.value = error.message
      return false
    }

    categories.value = categories.value.map((item) => (item.id === id ? data : item))
    return true
  }

  async function deleteCategory(id) {
    if (!userId.value || !id) return false
    errorMessage.value = ''

    const inUse = habits.value.some((habit) => habit.category_id === id && !habit.is_archived)
    if (inUse) {
      errorMessage.value = 'Move or archive habits in this category before deleting it.'
      return false
    }

    const { error } = await supabase.from('habit_categories').delete().eq('id', id).eq('user_id', userId.value)
    if (error) {
      errorMessage.value = error.message
      return false
    }

    categories.value = categories.value.filter((item) => item.id !== id)
    if (selectedCategoryId.value === id) selectedCategoryId.value = 'all'
    return true
  }

  async function createHabit(payload) {
    if (!userId.value || !payload.title?.trim()) return false
    errorMessage.value = ''
    isSaving.value = true

    const row = {
      user_id: userId.value,
      ...normalizeHabitPayload(payload),
      is_archived: false,
    }

    const { data, error } = await supabase.from('habits').insert(row).select().single()
    isSaving.value = false

    if (error) {
      errorMessage.value = error.message
      return false
    }

    habits.value = [data, ...habits.value]
    focusHabitId.value = data.id
    return true
  }

  async function updateHabit(id, payload) {
    if (!userId.value || !id) return false
    errorMessage.value = ''
    isSaving.value = true

    const patch = { ...normalizeHabitPayload(payload) }
    if (payload.is_archived != null) patch.is_archived = payload.is_archived

    const { data, error } = await supabase
      .from('habits')
      .update(patch)
      .eq('id', id)
      .eq('user_id', userId.value)
      .select()
      .single()

    isSaving.value = false

    if (error) {
      errorMessage.value = error.message
      return false
    }

    habits.value = habits.value.map((habit) => (habit.id === id ? data : habit))
    return true
  }

  async function archiveHabit(id) {
    const habit = habits.value.find((item) => item.id === id)
    if (!habit) return false
    return updateHabit(id, {
      ...habit,
      category_id: habit.category_id,
      is_archived: true,
    })
  }

  async function saveProgress(next) {
    if (!userId.value) return
    progress.value = next
    await supabase
      .from('habit_user_progress')
      .upsert({
        user_id: userId.value,
        xp: next.xp,
        level: next.level,
        freeze_tokens: next.freeze_tokens,
        badges: next.badges,
      })
  }

  async function awardCompletionRewards(habit, wasNew) {
    if (!wasNew || !habit) return
    const xpGain = Number(habit.xp_reward) || 10
    const xp = (progress.value.xp || 0) + xpGain
    const level = levelFromXp(xp)
    const set = checksByHabit.value.get(habit.id) || new Set()
    const freezeSet = freezesByHabit.value.get(habit.id) || new Set()
    const streaks = computeStreak(habit, set, freezeSet, todayKey.value)
    const totalCompletions = checks.value.filter((c) => isCompletedCheck(c)).length + (wasNew ? 0 : 0)
    const ctx = {
      totalCompletions: checks.value.filter((c) => isCompletedCheck(c)).length,
      bestStreak: Math.max(
        streaks.best,
        ...activeHabits.value.map((h) => {
          const s = checksByHabit.value.get(h.id) || new Set()
          const f = freezesByHabit.value.get(h.id) || new Set()
          return computeStreak(h, s, f, todayKey.value).best
        }),
      ),
      hasQuantity: activeHabits.value.some((h) => h.habit_type === 'quantity'),
      level,
      freezeUsed: freezes.value.length > 0,
    }
    void totalCompletions
    const existing = new Set(progress.value.badges || [])
    for (const badge of BADGE_DEFS) {
      if (badge.test(ctx)) existing.add(badge.id)
    }

    // Monthly freeze grant: +1 token when leveling up
    let freeze_tokens = progress.value.freeze_tokens ?? 2
    if (level > (progress.value.level || 1)) freeze_tokens += 1

    await saveProgress({
      xp,
      level,
      freeze_tokens,
      badges: [...existing],
    })
  }

  async function logCheck(habitId, options = {}) {
    if (!userId.value || !habitId) return false
    errorMessage.value = ''

    const dateKey = options.dateKey || todayKey.value
    const habit = habits.value.find((h) => h.id === habitId)
    const status = options.status || 'completed'
    const value = options.value != null ? Number(options.value) : null
    const mood = options.mood != null ? Number(options.mood) : null
    const journal_note = options.journal_note?.trim() || null
    const sentiment = options.sentiment || null

    const existing = checks.value.find((check) => check.habit_id === habitId && check.checked_on === dateKey)

    const payload = {
      user_id: userId.value,
      habit_id: habitId,
      checked_on: dateKey,
      status,
      value,
      mood,
      journal_note,
      sentiment,
    }

    if (!isOnline()) {
      await enqueueHabitCheck({ type: existing ? 'upsert' : 'insert', payload, existingId: existing?.id })
      offlinePending.value += 1
      if (existing) {
        checks.value = checks.value.map((c) => (c.id === existing.id ? { ...c, ...payload, id: existing.id } : c))
      } else {
        checks.value = [{ ...payload, id: `offline-${Date.now()}` }, ...checks.value]
      }
      return true
    }

    if (existing) {
      const { data, error } = await supabase
        .from('habit_checks')
        .update({ status, value, mood, journal_note, sentiment })
        .eq('id', existing.id)
        .eq('user_id', userId.value)
        .select()
        .single()

      if (error) {
        errorMessage.value = error.message
        return false
      }

      checks.value = checks.value.map((check) => (check.id === existing.id ? data : check))
      return true
    }

    const { data, error } = await supabase.from('habit_checks').insert(payload).select().single()
    if (error) {
      errorMessage.value = error.message
      return false
    }

    checks.value = [data, ...checks.value]
    await awardCompletionRewards(habit, true)
    return true
  }

  async function toggleCheck(habitId, dateKey = todayKey.value) {
    if (!userId.value || !habitId) return false
    errorMessage.value = ''

    const habit = habits.value.find((h) => h.id === habitId)
    const existing = checks.value.find((check) => check.habit_id === habitId && check.checked_on === dateKey)

    if (existing) {
      if (!isOnline()) {
        await enqueueHabitCheck({ type: 'delete', existingId: existing.id, payload: { habit_id: habitId, checked_on: dateKey } })
        offlinePending.value += 1
        checks.value = checks.value.filter((check) => check.id !== existing.id)
        return true
      }

      const { error } = await supabase
        .from('habit_checks')
        .delete()
        .eq('id', existing.id)
        .eq('user_id', userId.value)

      if (error) {
        errorMessage.value = error.message
        return false
      }

      checks.value = checks.value.filter((check) => check.id !== existing.id)
      return true
    }

    // Quantity/duration: default to target value on one-tap
    const value =
      habit && habit.habit_type !== 'boolean' && habit.target_value != null
        ? Number(habit.target_value)
        : null

    return logCheck(habitId, { dateKey, status: 'completed', value })
  }

  async function useStreakFreeze(habitId, dateKey = todayKey.value) {
    if (!userId.value || !habitId) return false
    if ((progress.value.freeze_tokens || 0) <= 0) {
      errorMessage.value = 'No streak freezes left.'
      return false
    }

    const existing = freezes.value.find((f) => f.habit_id === habitId && f.used_on === dateKey)
    if (existing) return true

    const { data, error } = await supabase
      .from('habit_freezes')
      .insert({ user_id: userId.value, habit_id: habitId, used_on: dateKey })
      .select()
      .single()

    if (error) {
      errorMessage.value = error.message
      return false
    }

    freezes.value = [data, ...freezes.value]
    await saveProgress({
      ...progress.value,
      freeze_tokens: Math.max(0, (progress.value.freeze_tokens || 0) - 1),
      badges: [...new Set([...(progress.value.badges || []), 'freeze_saver'])],
    })
    return true
  }

  async function updateCheckMeta(habitId, dateKey, meta) {
    return logCheck(habitId, {
      dateKey,
      status: meta.status || 'completed',
      value: meta.value,
      mood: meta.mood,
      journal_note: meta.journal_note,
      sentiment: meta.sentiment,
    })
  }

  function downloadExport(format = 'json') {
    const blob =
      format === 'csv'
        ? new Blob([exportHabitsCsv(habits.value, checks.value)], { type: 'text/csv;charset=utf-8' })
        : new Blob([exportHabitsJson(habits.value, checks.value, categories.value)], {
            type: 'application/json',
          })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = format === 'csv' ? 'habits-export.csv' : 'habits-export.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  watch(
    userId,
    (id) => {
      if (id) fetchHabits()
      else {
        categories.value = []
        habits.value = []
        checks.value = []
        freezes.value = []
        dailyJournals.value = []
      }
    },
    { immediate: true },
  )

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      if (userId.value) fetchHabits()
    })
  }

  return {
    categories,
    habits,
    checks,
    freezes,
    dailyJournals,
    progress,
    isLoading,
    isSaving,
    errorMessage,
    selectedCategoryId,
    focusHabitId,
    heatMonth,
    todayKey,
    activeHabits,
    filteredHabits,
    focusHabit,
    habitRows,
    heatCells,
    historySeries,
    monthlySeries,
    anomalies,
    moodSeries,
    offlinePending,
    checksByHabit,
    todayJournal,
    journalFeed,
    checkInJournalEntries,
    fetchHabits,
    getDailyJournal,
    saveDailyJournal,
    createCategory,
    updateCategory,
    deleteCategory,
    createHabit,
    updateHabit,
    archiveHabit,
    toggleCheck,
    logCheck,
    updateCheckMeta,
    useStreakFreeze,
    downloadExport,
  }
}
