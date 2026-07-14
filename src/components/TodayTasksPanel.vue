<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps({
  todayTasks: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['go-to-task'])

const isMobile = ref(false)
const activeColumn = ref(
  props.todayTasks.overdue?.length
    ? 'overdue'
    : props.todayTasks.dueToday?.length
      ? 'dueToday'
      : 'completedToday',
)
let mediaQuery = null

function syncViewport() {
  isMobile.value = Boolean(mediaQuery?.matches)
}

onMounted(() => {
  mediaQuery = window.matchMedia('(max-width: 767px)')
  syncViewport()
  mediaQuery.addEventListener('change', syncViewport)
})

onUnmounted(() => {
  mediaQuery?.removeEventListener('change', syncViewport)
})

const dateLabel = computed(() =>
  new Intl.DateTimeFormat('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Manila',
  }).format(new Date()),
)

function formatTime(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Manila',
  }).format(new Date(value))
}

function locationLabel(task) {
  if (task.space?.name && task.list?.name) return `${task.space.name} / ${task.list.name}`
  return task.space?.name || task.list?.name || 'No location'
}

const isEmpty = computed(
  () =>
    !props.todayTasks.overdue.length
    && !props.todayTasks.dueToday.length
    && !props.todayTasks.completedToday.length,
)

const columns = computed(() => [
  {
    key: 'overdue',
    label: 'Overdue',
    shortLabel: 'overdue',
    tasks: props.todayTasks.overdue,
    tone: 'today-column--overdue',
    headingClass: 'text-rose-600 dark:text-rose-300',
    badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200',
    activeClass: 'today-filter-btn--overdue-active',
    rowClass: 'today-task-row--overdue',
    timeClass: 'text-rose-600 dark:text-rose-300',
    locationClass: 'text-rose-700/80 dark:text-rose-300/80',
    countClass: 'today-column-count--overdue',
    emptyLabel: 'No overdue tasks',
  },
  {
    key: 'dueToday',
    label: 'Due today',
    shortLabel: 'due',
    tasks: props.todayTasks.dueToday,
    tone: 'today-column--due',
    headingClass: 'text-sky-600 dark:text-sky-300',
    badgeClass: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200',
    activeClass: 'today-filter-btn--due-active',
    rowClass: 'today-task-row--due',
    timeClass: 'text-sky-600 dark:text-sky-300',
    locationClass: 'text-sky-700/80 dark:text-sky-300/80',
    countClass: 'today-column-count--due',
    emptyLabel: 'Nothing due today',
  },
  {
    key: 'completedToday',
    label: 'Completed today',
    shortLabel: 'done',
    tasks: props.todayTasks.completedToday,
    tone: 'today-column--done',
    headingClass: 'text-emerald-600 dark:text-emerald-300',
    badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200',
    activeClass: 'today-filter-btn--done-active',
    rowClass: 'today-task-row--done',
    timeClass: '',
    locationClass: '',
    countClass: 'today-column-count--done',
    emptyLabel: 'Nothing completed yet',
    done: true,
  },
])

const visibleColumns = computed(() => {
  if (!isMobile.value) return columns.value
  return columns.value.filter((column) => column.key === activeColumn.value)
})
</script>

<template>
  <section class="today-tasks-panel dashboard-card rounded-2xl">
    <header class="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="type-kicker text-emerald-600 dark:text-emerald-300">Today</p>
        <h3 class="type-section-title mt-1.5 text-slate-950 dark:text-slate-100">{{ dateLabel }}</h3>
        <p class="type-body-sm type-muted mt-1.5">Tasks due or overdue today across all spaces.</p>
      </div>

      <!-- Mobile: filter buttons -->
      <div class="flex w-full flex-wrap gap-2 md:hidden">
        <button
          v-for="column in columns"
          :key="`btn-${column.key}`"
          class="today-filter-btn"
          :class="[column.badgeClass, activeColumn === column.key ? column.activeClass : '']"
          type="button"
          :aria-pressed="activeColumn === column.key"
          @click="activeColumn = column.key"
        >
          {{ column.tasks.length }} {{ column.shortLabel }}
        </button>
      </div>

      <!-- Desktop: static counts -->
      <div class="hidden flex-wrap gap-2 md:flex">
        <span
          v-for="column in columns"
          :key="`pill-${column.key}`"
          class="rounded-full px-3 py-1.5 text-sm font-bold"
          :class="column.badgeClass"
        >
          {{ column.tasks.length }} {{ column.shortLabel }}
        </span>
      </div>
    </header>

    <div v-if="isEmpty" class="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center dark:border-slate-600">
      <p class="type-body font-semibold text-slate-700 dark:text-slate-200">Nothing scheduled for today.</p>
      <p class="type-body-sm type-muted mt-1.5">You're clear — or add due dates to see tasks here.</p>
    </div>

    <div v-else class="today-tasks-columns">
      <section
        v-for="column in visibleColumns"
        :key="column.key"
        class="today-column"
        :class="column.tone"
      >
        <div class="today-column-header">
          <h4 class="type-body-sm font-bold uppercase tracking-wide" :class="column.headingClass">
            {{ column.label }}
          </h4>
          <span class="today-column-count" :class="column.countClass">{{ column.tasks.length }}</span>
        </div>

        <ul v-if="column.tasks.length" class="today-column-list space-y-2.5">
          <li
            v-for="task in column.tasks"
            :key="task.id"
            class="today-task-row"
            :class="column.rowClass"
          >
            <button
              class="today-task-shortcut min-w-0 flex-1 text-left"
              type="button"
              :title="`Go to ${locationLabel(task)}`"
              @click="emit('go-to-task', { task, section: column.key })"
            >
              <span
                class="type-body block truncate font-semibold"
                :class="column.done ? 'text-slate-600 line-through dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'"
              >
                {{ task.title }}
              </span>
              <span
                v-if="!column.done"
                class="type-body-sm mt-0.5 block truncate"
                :class="column.locationClass || 'type-muted'"
              >
                {{ locationLabel(task) }}
              </span>
            </button>
            <span
              v-if="!column.done && task.due_date"
              class="type-body-sm shrink-0 font-semibold"
              :class="column.timeClass"
            >
              {{ formatTime(task.due_date) }}
            </span>
          </li>
        </ul>

        <p v-else class="today-column-empty">{{ column.emptyLabel }}</p>
      </section>
    </div>
  </section>
</template>

<style scoped>
.today-filter-btn {
  border-radius: 9999px;
  border: 1px solid transparent;
  padding: 0.4rem 0.85rem;
  font-size: 0.8125rem;
  font-weight: 800;
  line-height: 1.2;
  transition: box-shadow 0.15s ease, transform 0.15s ease, border-color 0.15s ease;
}

.today-filter-btn--overdue-active {
  border-color: rgb(244 63 94 / 0.45);
  box-shadow: 0 0 0 3px rgb(244 63 94 / 0.15);
}

.today-filter-btn--due-active {
  border-color: rgb(14 165 233 / 0.45);
  box-shadow: 0 0 0 3px rgb(14 165 233 / 0.15);
}

.today-filter-btn--done-active {
  border-color: rgb(16 185 129 / 0.45);
  box-shadow: 0 0 0 3px rgb(16 185 129 / 0.15);
}

.today-tasks-columns {
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(0, 1fr);
  width: 100%;
  min-width: 0;
}

@media (min-width: 768px) {
  .today-tasks-columns {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1.25rem;
  }
}

.today-column {
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  box-sizing: border-box;
  border-radius: 1rem;
  border: 1px solid rgb(226 232 240 / 0.9);
  background: rgb(255 255 255 / 0.55);
  padding: 0.85rem;
}

.dark .today-column {
  border-color: rgb(51 65 85 / 0.9);
  background: rgb(15 23 42 / 0.35);
}

.today-column--overdue {
  border-color: rgb(254 202 202 / 0.75);
  background: rgb(255 241 242 / 0.45);
}

.dark .today-column--overdue {
  border-color: rgb(244 63 94 / 0.25);
  background: rgb(127 29 29 / 0.12);
}

.today-column--due {
  border-color: rgb(186 230 253 / 0.75);
  background: rgb(240 249 255 / 0.45);
}

.dark .today-column--due {
  border-color: rgb(14 165 233 / 0.25);
  background: rgb(12 74 110 / 0.12);
}

.today-column--done {
  border-color: rgb(167 243 208 / 0.75);
  background: rgb(236 253 245 / 0.45);
}

.dark .today-column--done {
  border-color: rgb(16 185 129 / 0.25);
  background: rgb(6 78 59 / 0.12);
}

.today-column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.today-column-count {
  display: grid;
  min-width: 1.65rem;
  height: 1.65rem;
  place-items: center;
  border-radius: 9999px;
  background: rgb(255 255 255 / 0.8);
  font-size: 0.75rem;
  font-weight: 800;
  color: rgb(100 116 139);
}

.dark .today-column-count {
  background: rgb(30 41 59 / 0.8);
  color: rgb(148 163 184);
}

.today-column-count--overdue {
  background: rgb(254 226 226);
  color: rgb(190 18 60);
}

.dark .today-column-count--overdue {
  background: rgb(127 29 29 / 0.45);
  color: rgb(251 113 133);
}

.today-column-count--due {
  background: rgb(224 242 254);
  color: rgb(3 105 161);
}

.dark .today-column-count--due {
  background: rgb(12 74 110 / 0.45);
  color: rgb(125 211 252);
}

.today-column-count--done {
  background: rgb(209 250 229);
  color: rgb(5 150 105);
}

.dark .today-column-count--done {
  background: rgb(6 78 59 / 0.45);
  color: rgb(52 211 153);
}

/* Mobile: expand fully — no inner scroll / clip */
.today-column-list {
  max-height: none;
  overflow: visible;
  padding-right: 0;
}

/* Desktop 3-col: keep a soft max so one long column doesn't stretch forever */
@media (min-width: 768px) {
  .today-column-list {
    max-height: 22rem;
    overflow-y: auto;
    padding-right: 0.15rem;
    scrollbar-width: thin;
  }
}

.today-column-empty {
  flex: 1;
  display: grid;
  place-items: center;
  min-height: 6rem;
  border-radius: 0.85rem;
  border: 1px dashed rgb(203 213 225 / 0.9);
  padding: 1rem;
  text-align: center;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgb(100 116 139);
}

.today-task-shortcut {
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.today-task-shortcut:hover {
  opacity: 0.85;
}

.dark .today-column-empty {
  border-color: rgb(71 85 105 / 0.9);
  color: rgb(148 163 184);
}
</style>
