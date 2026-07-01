<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  tasks: {
    type: Array,
    default: () => [],
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['edit-task'])

const today = new Date()
today.setHours(0, 0, 0, 0)

const viewMonth = ref(today.getMonth())
const viewYear = ref(today.getFullYear())

const monthStart = computed(() => new Date(viewYear.value, viewMonth.value, 1))
const monthLabel = computed(() =>
  new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(monthStart.value),
)

const isViewingToday = computed(
  () => viewMonth.value === today.getMonth() && viewYear.value === today.getFullYear(),
)

const monthTasks = computed(() => {
  const year = viewYear.value
  const month = viewMonth.value
  return props.tasks.filter((task) => {
    if (!task.due_date || task.status === 'archived') return false
    const due = new Date(task.due_date)
    return due.getFullYear() === year && due.getMonth() === month
  })
})

const monthStats = computed(() => {
  const endOfToday = new Date(today)
  endOfToday.setHours(23, 59, 59, 999)

  return {
    total: monthTasks.value.length,
    overdue: monthTasks.value.filter((task) => new Date(task.due_date) < today && task.status !== 'done').length,
    today: monthTasks.value.filter((task) => isSameDay(new Date(task.due_date), today)).length,
    done: monthTasks.value.filter((task) => task.status === 'done').length,
  }
})

const calendarDays = computed(() => {
  const start = monthStart.value
  const startDay = (start.getDay() + 6) % 7
  const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
  const cells = []

  for (let index = 0; index < startDay; index += 1) {
    const day = new Date(start.getFullYear(), start.getMonth(), index - startDay + 1)
    cells.push(buildCell(day, 'outside'))
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(start.getFullYear(), start.getMonth(), day)
    cells.push(buildCell(date, 'current'))
  }

  const trailing = (7 - (cells.length % 7)) % 7
  for (let index = 1; index <= trailing; index += 1) {
    const date = new Date(start.getFullYear(), start.getMonth() + 1, index)
    cells.push(buildCell(date, 'outside'))
  }

  return cells
})

function buildCell(date, scope) {
  const key = formatDateKey(date)
  const dayTasks = props.tasks.filter(
    (task) => task.due_date && task.status !== 'archived' && formatDateKey(new Date(task.due_date)) === key,
  )
  const weekday = date.getDay()

  return {
    key: `${scope}-${key}`,
    day: date.getDate(),
    date,
    scope,
    tasks: dayTasks,
    isToday: isSameDay(date, today),
    isWeekend: weekday === 0 || weekday === 6,
    hasTasks: dayTasks.length > 0,
    hasUrgent: dayTasks.some((task) => ['urgent', 'high'].includes(task.priority)),
  }
}

function formatDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

function prevMonth() {
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value -= 1
    return
  }
  viewMonth.value -= 1
}

function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value += 1
    return
  }
  viewMonth.value += 1
}

function goToToday() {
  viewMonth.value = today.getMonth()
  viewYear.value = today.getFullYear()
}

function priorityClass(priority) {
  const map = {
    urgent: 'calendar-task--urgent',
    high: 'calendar-task--high',
    normal: 'calendar-task--normal',
    low: 'calendar-task--low',
  }
  return map[priority] || map.normal
}
</script>

<template>
  <section class="calendar-view">
    <header class="calendar-hero dashboard-card">
      <div class="calendar-hero-glow" aria-hidden="true"></div>
      <div class="calendar-hero-bar" aria-hidden="true"></div>

      <div class="calendar-hero-inner">
        <div class="min-w-0 flex-1">
          <div class="calendar-hero-eyebrow">
            <span class="calendar-hero-dot"></span>
            <span class="type-label text-emerald-700 dark:text-emerald-300">Schedule view</span>
          </div>
          <h3 class="calendar-hero-title">{{ monthLabel }}</h3>
          <p class="type-caption type-muted mt-1">Drag-free overview of due dates in this list</p>
        </div>

        <div class="calendar-hero-nav">
          <button class="calendar-nav-btn" type="button" aria-label="Previous month" @click="prevMonth">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            class="calendar-nav-btn calendar-today-btn"
            type="button"
            title="Today"
            aria-label="Go to today"
            :disabled="isViewingToday"
            @click="goToToday"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          </button>
          <button class="calendar-nav-btn" type="button" aria-label="Next month" @click="nextMonth">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      <div class="calendar-stat-row">
        <div class="calendar-stat-chip calendar-stat-chip--indigo">
          <span class="calendar-stat-value">{{ monthStats.total }}</span>
          <span class="calendar-stat-label">Due this month</span>
        </div>
        <div class="calendar-stat-chip calendar-stat-chip--emerald">
          <span class="calendar-stat-value">{{ monthStats.today }}</span>
          <span class="calendar-stat-label">Due today</span>
        </div>
        <div class="calendar-stat-chip calendar-stat-chip--rose">
          <span class="calendar-stat-value">{{ monthStats.overdue }}</span>
          <span class="calendar-stat-label">Overdue</span>
        </div>
        <div class="calendar-stat-chip calendar-stat-chip--violet">
          <span class="calendar-stat-value">{{ monthStats.done }}</span>
          <span class="calendar-stat-label">Completed</span>
        </div>
      </div>
    </header>

    <div v-if="isLoading" class="calendar-skeleton">
      <div v-for="index in 35" :key="index" class="calendar-skeleton-cell"></div>
    </div>

    <div v-else class="calendar-panel dashboard-card">
      <div class="calendar-panel-top">
        <div class="calendar-weekdays">
          <span
            v-for="(label, index) in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']"
            :key="label"
            class="calendar-weekday"
            :class="index >= 5 ? 'calendar-weekday--weekend' : ''"
          >
            {{ label }}
          </span>
        </div>
      </div>

      <div class="calendar-grid">
        <div
          v-for="cell in calendarDays"
          :key="cell.key"
          class="calendar-cell"
          :class="{
            'calendar-cell--outside': cell.scope === 'outside',
            'calendar-cell--today': cell.isToday,
            'calendar-cell--weekend': cell.isWeekend && cell.scope === 'current',
            'calendar-cell--has-tasks': cell.hasTasks,
            'calendar-cell--urgent': cell.hasUrgent,
          }"
        >
          <div class="calendar-cell-inner">
            <div class="calendar-cell-head">
              <span class="calendar-day-num" :class="{ 'calendar-day-num--today': cell.isToday }">
                {{ cell.day }}
              </span>
              <span v-if="cell.hasTasks" class="calendar-day-count">{{ cell.tasks.length }}</span>
            </div>

            <div v-if="cell.scope === 'current' && cell.hasTasks" class="calendar-cell-tasks">
              <button
                v-for="task in cell.tasks.slice(0, 3)"
                :key="task.id"
                class="calendar-task"
                :class="priorityClass(task.priority)"
                type="button"
                :title="task.title"
                @click="emit('edit-task', task)"
              >
                <span class="calendar-task-dot"></span>
                <span class="calendar-task-body">
                  <span v-if="task.due_date" class="calendar-task-time">{{ formatTime(task.due_date) }}</span>
                  <span class="calendar-task-title">{{ task.title }}</span>
                </span>
              </button>
              <p v-if="cell.tasks.length > 3" class="calendar-more">+{{ cell.tasks.length - 3 }} more</p>
            </div>

            <p
              v-else-if="cell.scope === 'current' && cell.isToday && !cell.hasTasks"
              class="calendar-empty-hint"
            >
              Nothing due
            </p>
          </div>
        </div>
      </div>

      <footer class="calendar-legend">
        <span class="calendar-legend-item"><i class="calendar-legend-swatch calendar-task--urgent"></i>Urgent</span>
        <span class="calendar-legend-item"><i class="calendar-legend-swatch calendar-task--high"></i>High</span>
        <span class="calendar-legend-item"><i class="calendar-legend-swatch calendar-task--normal"></i>Normal</span>
        <span class="calendar-legend-item"><i class="calendar-legend-swatch calendar-task--low"></i>Low</span>
      </footer>
    </div>
  </section>
</template>
