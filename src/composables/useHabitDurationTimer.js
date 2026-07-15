import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const STORAGE_KEY = 'tasker:habit-duration-timer'

/**
 * Convert habit target to milliseconds. Treat unit containing "sec" as seconds;
 * otherwise minutes (default for duration habits).
 */
export function durationTargetToMs(habit) {
  const raw = Number(habit?.target_value)
  if (!Number.isFinite(raw) || raw <= 0) return 60_000
  const unit = String(habit?.unit || 'mins').toLowerCase()
  if (unit.includes('sec')) return Math.round(raw * 1000)
  if (unit.includes('hour') || unit === 'h' || unit === 'hr' || unit === 'hrs') {
    return Math.round(raw * 60 * 60 * 1000)
  }
  return Math.round(raw * 60 * 1000)
}

export function formatCountdown(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  const hours = Math.floor(totalSec / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function readStored() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.habitId || !parsed?.endsAt || !parsed?.todayKey) return null
    return parsed
  } catch {
    return null
  }
}

function writeStored(payload) {
  try {
    if (!payload) sessionStorage.removeItem(STORAGE_KEY)
    else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* ignore */
  }
}

function resolveTodayKey(todayKey) {
  if (typeof todayKey === 'function') return todayKey()
  return todayKey?.value || ''
}

export function useHabitDurationTimer({ todayKey, onComplete }) {
  const activeHabitId = ref(null)
  const endsAt = ref(null)
  const nowMs = ref(Date.now())
  let tickId = null

  const remainingMs = computed(() => {
    if (!endsAt.value) return 0
    return Math.max(0, endsAt.value - nowMs.value)
  })

  const isRunning = computed(() => Boolean(activeHabitId.value && endsAt.value))

  const displayLabel = computed(() => formatCountdown(remainingMs.value))

  function clearTick() {
    if (tickId != null) {
      window.clearInterval(tickId)
      tickId = null
    }
  }

  function stopTimer({ persistClear = true } = {}) {
    clearTick()
    activeHabitId.value = null
    endsAt.value = null
    if (persistClear) writeStored(null)
  }

  async function finishIfDue() {
    if (!activeHabitId.value || !endsAt.value) return
    if (endsAt.value - Date.now() > 0) return
    const habitId = activeHabitId.value
    stopTimer()
    if (typeof onComplete === 'function') {
      await onComplete(habitId)
    }
  }

  function startTick() {
    clearTick()
    nowMs.value = Date.now()
    tickId = window.setInterval(async () => {
      nowMs.value = Date.now()
      if (endsAt.value && endsAt.value <= nowMs.value) {
        await finishIfDue()
      }
    }, 250)
  }

  function start(habit) {
    if (!habit?.id) return { ok: false, reason: 'missing' }
    const key = resolveTodayKey(todayKey)
    const durationMs = durationTargetToMs(habit)
    const nextEnds = Date.now() + durationMs
    activeHabitId.value = habit.id
    endsAt.value = nextEnds
    writeStored({
      habitId: habit.id,
      endsAt: nextEnds,
      todayKey: key,
      targetValue: habit.target_value ?? null,
    })
    startTick()
    return { ok: true }
  }

  function cancel() {
    stopTimer()
  }

  function isActiveFor(habitId) {
    return isRunning.value && activeHabitId.value === habitId
  }

  function restore() {
    const stored = readStored()
    if (!stored) return
    const key = resolveTodayKey(todayKey)
    if (stored.todayKey !== key) {
      writeStored(null)
      return
    }
    if (stored.endsAt <= Date.now()) {
      const habitId = stored.habitId
      writeStored(null)
      if (typeof onComplete === 'function') onComplete(habitId)
      return
    }
    activeHabitId.value = stored.habitId
    endsAt.value = stored.endsAt
    startTick()
  }

  watch(
    () => resolveTodayKey(todayKey),
    (key, prev) => {
      if (key && prev && key !== prev) stopTimer()
    },
  )

  onMounted(() => {
    restore()
  })

  onUnmounted(() => {
    clearTick()
  })

  return {
    activeHabitId,
    endsAt,
    remainingMs,
    isRunning,
    displayLabel,
    start,
    cancel,
    isActiveFor,
    stopTimer,
  }
}
