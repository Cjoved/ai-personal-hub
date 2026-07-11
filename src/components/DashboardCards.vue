<script setup>
import { computed } from 'vue'
import DashboardBarChart from './DashboardBarChart.vue'
import DashboardDonutChart from './DashboardDonutChart.vue'
import TodayTasksPanel from './TodayTasksPanel.vue'
import { getStatusNeonClass } from '../composables/statusNeon'

const props = defineProps({
  stats: {
    type: Object,
    required: true,
  },
  title: {
    type: String,
    default: 'Dashboard',
  },
  breakdownScope: {
    type: String,
    default: 'home',
    validator: (value) => ['home', 'space'].includes(value),
  },
  space: {
    type: Object,
    default: null,
  },
  todayTasks: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['go-to-task'])

const isHomeScope = computed(() => props.breakdownScope === 'home')

const headerSubtitle = computed(() =>
  isHomeScope.value
    ? 'Workspace-wide view across all your spaces, lists, and tasks.'
    : `Focused analytics for lists inside ${props.space?.name || 'this space'}.`,
)

const heroEyebrow = computed(() => (isHomeScope.value ? 'Home command center' : 'Space dashboard'))

const heroBadgeLabel = computed(() =>
  isHomeScope.value ? 'All spaces' : props.space?.name || 'Current space',
)

const spaceThemeStyle = computed(() => {
  if (isHomeScope.value || !props.space?.color) return {}

  return {
    '--space-accent': props.space.color,
    '--space-color': props.space.color,
    '--row-color': props.space.color,
    '--track-color': props.space.color,
  }
})

const spaceAccentColor = computed(() => props.space?.color || '#10b981')

const listCount = computed(() => props.stats.listStats?.length || 0)

const spaceCount = computed(() => props.stats.spaceStats?.length || 0)

const totalListCount = computed(() => props.stats.listStats?.length || 0)

const focusList = computed(() => {
  const rows = props.stats.listStats || []
  if (!rows.length) return null
  return [...rows].sort((first, second) => second.open - first.open || second.total - first.total)[0]
})

const homeStatCards = [
  {
    key: 'spaceCount',
    label: 'Spaces',
    tone: 'text-indigo-700 dark:text-indigo-200',
    iconBg: 'bg-indigo-500/15 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300',
    accentBar: 'bg-indigo-500',
    glow: 'bg-indigo-400/30',
    border: 'border-indigo-200/80 dark:border-indigo-400/30',
  },
  {
    key: 'totalLists',
    label: 'Lists',
    tone: 'text-cyan-700 dark:text-cyan-200',
    iconBg: 'bg-cyan-500/15 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-300',
    accentBar: 'bg-cyan-500',
    glow: 'bg-cyan-400/30',
    border: 'border-cyan-200/80 dark:border-cyan-400/30',
  },
  {
    key: 'openTasks',
    label: 'Open tasks',
    tone: 'text-sky-950 dark:text-sky-200',
    iconBg: 'bg-sky-500/15 text-sky-600',
    accentBar: 'bg-sky-500',
    glow: 'bg-sky-400/30',
    border: 'border-sky-200/80',
  },
  {
    key: 'completionRate',
    label: 'Workspace completion',
    tone: 'text-emerald-700 dark:text-emerald-200',
    iconBg: 'bg-emerald-500/15 text-emerald-600',
    accentBar: 'bg-emerald-500',
    glow: 'bg-emerald-400/30',
    border: 'border-emerald-200/80',
    suffix: '%',
  },
]

const spaceStatCards = [
  {
    key: 'openTasks',
    label: 'Open in space',
    tone: 'text-sky-950 dark:text-sky-200',
    iconBg: 'bg-sky-500/15 text-sky-600',
    accentBar: 'bg-sky-500',
    glow: 'bg-sky-400/30',
    border: 'border-sky-200/80',
  },
  {
    key: 'overdue',
    label: 'Overdue here',
    tone: 'text-rose-700 dark:text-rose-200',
    iconBg: 'bg-rose-500/15 text-rose-600',
    accentBar: 'bg-rose-500',
    glow: 'bg-rose-400/30',
    border: 'border-rose-200/80',
  },
  {
    key: 'totalTasks',
    label: 'Tasks in space',
    tone: 'text-violet-700 dark:text-violet-200',
    iconBg: 'bg-violet-500/15 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300',
    accentBar: 'bg-violet-500',
    glow: 'bg-violet-400/30',
    border: 'border-violet-200/80 dark:border-violet-400/30',
  },
  {
    key: 'completionRate',
    label: 'Space completion',
    tone: 'text-emerald-700 dark:text-emerald-200',
    iconBg: 'bg-emerald-500/15 text-emerald-600',
    accentBar: 'bg-emerald-500',
    glow: 'bg-emerald-400/30',
    border: 'border-emerald-200/80',
    suffix: '%',
  },
]

const visibleStatCards = computed(() => (isHomeScope.value ? homeStatCards : spaceStatCards))

const statusChartSegments = computed(() =>
  ['inbox', 'todo', 'in_progress', 'done', 'archived']
    .map((status) => ({
      label: statusLabels[status] || status,
      value: props.stats.statusCounts?.[status] || 0,
      color: statusChartColors[status],
    }))
    .filter((segment) => segment.value > 0),
)

const priorityChartSegments = computed(() =>
  ['urgent', 'high', 'normal', 'low']
    .map((priority) => ({
      label: priorityLabels[priority] || priority,
      value: props.stats.priorityCounts?.[priority] || 0,
      color: priorityChartColors[priority],
    }))
    .filter((segment) => segment.value > 0),
)

const spaceOpenBarItems = computed(() =>
  [...(props.stats.spaceStats || [])]
    .sort((first, second) => second.open - first.open)
    .map((space) => ({
      label: space.name,
      value: space.open,
      color: space.color || '#6366f1',
      sublabel: `${space.completionRate}% complete`,
    })),
)

const listOpenBarItems = computed(() =>
  [...(props.stats.listStats || [])]
    .sort((first, second) => second.open - first.open)
    .map((list) => ({
      label: list.name,
      value: list.open,
      color: spaceAccentColor.value,
      sublabel: `${list.completionRate}% complete`,
    })),
)

const statusChartColors = {
  inbox: '#818cf8',
  todo: '#a78bfa',
  in_progress: '#22d3ee',
  done: '#34d399',
  archived: '#e879f9',
}

const priorityChartColors = {
  urgent: '#fb7185',
  high: '#fb923c',
  normal: '#fbbf24',
  low: '#22d3ee',
}

const statusLabels = {
  inbox: 'Inbox',
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
  archived: 'Archived',
}

const priorityLabels = {
  urgent: 'Urgent',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
}

const statusPillTones = {
  inbox: 'bg-indigo-100 text-indigo-700 ring-indigo-200/80 dark:bg-indigo-500/20 dark:text-indigo-200 dark:ring-indigo-400/30',
  todo: 'bg-violet-100 text-violet-700 ring-violet-200/80 dark:bg-violet-500/20 dark:text-violet-200 dark:ring-violet-400/30',
  in_progress: 'bg-cyan-100 text-cyan-800 ring-cyan-200/80 dark:bg-cyan-500/20 dark:text-cyan-200 dark:ring-cyan-400/30',
  done: 'bg-emerald-100 text-emerald-700 ring-emerald-200/80 dark:bg-emerald-500/20 dark:text-emerald-200 dark:ring-emerald-400/30',
  archived: 'bg-fuchsia-100 text-fuchsia-600 ring-fuchsia-200/80 dark:bg-fuchsia-500/15 dark:text-fuchsia-200 dark:ring-fuchsia-400/30',
}

function formatDate(value) {
  if (!value) return 'No date'

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function statusPillTone(status) {
  return statusPillTones[status] || statusPillTones.todo
}

function statusNeonClass(status) {
  return getStatusNeonClass(status)
}

function rowColorStyle(row) {
  if (isHomeScope.value && row.color) {
    return { '--row-color': row.color, '--space-color': row.color, '--track-color': row.color }
  }

  const color = spaceAccentColor.value
  return { '--row-color': color, '--space-color': color, '--track-color': color }
}

function spaceInitial() {
  const name = props.space?.name || 'S'
  return props.space?.icon || name.slice(0, 1).toUpperCase()
}

function statValue(card) {
  if (card.key === 'spaceCount') return spaceCount.value
  if (card.key === 'totalLists') return totalListCount.value
  return props.stats[card.key] ?? 0
}

function taskLocation(task, scope = 'full') {
  if (scope === 'list' && task.list?.name) return task.list.name
  if (task.space?.name && task.list?.name) return `${task.space.name} / ${task.list.name}`
  if (task.list?.name) return task.list.name
  if (task.space?.name) return task.space.name
  return 'No location'
}
</script>

<template>
  <section
    class="dashboard-shell dashboard-grid space-y-6 rounded-3xl p-1 sm:p-2"
    :class="isHomeScope ? 'dashboard-home' : 'dashboard-space'"
    :style="spaceThemeStyle"
  >
    <!-- Home command center hero -->
    <div
      v-if="isHomeScope"
      class="dashboard-hero-home relative overflow-hidden rounded-3xl border border-indigo-500/20 p-6 sm:p-7 lg:p-8"
    >
      <div class="dashboard-hero-shine"></div>
      <div class="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-emerald-500/20 blur-3xl"></div>
      <div class="pointer-events-none absolute bottom-0 left-1/4 h-44 w-44 rounded-full bg-cyan-500/15 blur-3xl"></div>
      <div class="pointer-events-none absolute right-1/3 top-1/2 h-36 w-36 rounded-full bg-violet-500/15 blur-3xl"></div>
      <div class="dashboard-home-grid pointer-events-none absolute inset-0 opacity-[0.08]"></div>

      <div class="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div class="xl:max-w-none">
          <div class="flex flex-wrap items-center gap-2">
            <span class="dashboard-home-pill type-kicker inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-emerald-200">
              <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 10.5 12 3l9 7.5" />
                <path d="M5 9.5V20h14V9.5" />
              </svg>
              {{ heroEyebrow }}
            </span>
            <span class="type-badge rounded-full border border-white/10 bg-white/5 px-2.5 py-1 uppercase tracking-wide text-slate-300">
              {{ spaceCount }} spaces
            </span>
          </div>
          <h2 class="type-section-title mt-3 text-white xl:whitespace-nowrap">{{ headerSubtitle }}</h2>
        </div>

        <div class="flex flex-wrap items-center gap-2 xl:justify-end">
          <span class="type-pill inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1.5 text-emerald-200">
            <span class="relative flex h-2 w-2">
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60"></span>
              <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
            </span>
            Live workspace
          </span>
        </div>
      </div>
    </div>

    <TodayTasksPanel
      v-if="isHomeScope && todayTasks"
      :today-tasks="todayTasks"
      @go-to-task="emit('go-to-task', $event)"
    />

    <!-- Space-specific hero -->
    <div
      v-else
      class="dashboard-hero-space relative overflow-hidden rounded-3xl border p-6 sm:p-7 lg:p-8"
      :style="spaceThemeStyle"
    >
      <div class="dashboard-hero-space-bar pointer-events-none absolute inset-x-0 top-0 h-1.5"></div>
      <div class="dashboard-hero-space-glow pointer-events-none absolute -right-8 -top-8 h-48 w-48 rounded-full blur-3xl"></div>
      <div class="dashboard-hero-space-glow-soft pointer-events-none absolute bottom-0 left-0 h-40 w-40 rounded-full blur-3xl"></div>

      <div class="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-start gap-4">
          <span
            class="dashboard-space-avatar grid h-[4.5rem] w-[4.5rem] shrink-0 place-items-center rounded-2xl text-2xl font-black text-white shadow-lg"
          >
            {{ spaceInitial() }}
          </span>
          <div class="min-w-0">
            <span class="dashboard-space-pill type-kicker inline-flex items-center gap-2 rounded-full border px-3 py-1">
              <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              {{ heroEyebrow }}
            </span>
            <h2 class="type-display mt-2 text-white">{{ title }}</h2>
            <p class="type-body-sm mt-1.5 leading-relaxed text-slate-300">{{ headerSubtitle }}</p>
            <p class="type-caption mt-2 font-semibold text-slate-400">{{ listCount }} lists in this space</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 sm:justify-end">
          <span class="dashboard-space-stat-pill type-pill rounded-full border px-3 py-1.5">
            {{ heroBadgeLabel }}
          </span>
        </div>
      </div>
    </div>

    <div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <article
        v-for="card in visibleStatCards"
        :key="card.key"
        class="dashboard-card dashboard-stat-card rounded-2xl"
        :class="[card.border, isHomeScope ? '' : 'dashboard-space-stat-card']"
      >
        <span class="absolute inset-y-0 left-0 w-1.5 rounded-l-2xl" :class="card.accentBar"></span>
        <span class="pointer-events-none absolute -right-1 -top-1 h-24 w-24 rounded-full opacity-40 blur-2xl" :class="card.glow"></span>

        <div class="relative flex items-start justify-between gap-3">
          <div>
            <p class="type-label type-muted">{{ card.label }}</p>
            <p class="type-stat mt-3.5" :class="card.tone">
              {{ statValue(card) }}{{ card.suffix || '' }}
            </p>
          </div>

          <span class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl ring-1 ring-inset ring-white/70" :class="card.iconBg">
            <svg v-if="card.key === 'spaceCount'" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            <svg v-else-if="card.key === 'totalLists'" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 7h16M4 12h10M4 17h7" />
            </svg>
            <svg v-else-if="card.key === 'openTasks'" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <path d="M9 12h6M9 16h4" />
            </svg>
            <svg v-else-if="card.key === 'overdue'" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v6l3 2" />
            </svg>
            <svg v-else-if="card.key === 'totalTasks'" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 7h16M4 12h16M4 17h10" />
            </svg>
            <svg v-else class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
        </div>
      </article>
    </div>

    <!-- HOME: spaces-first layout -->
    <template v-if="isHomeScope">
      <article class="dashboard-card dashboard-feature-card rounded-2xl">
        <div class="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="dashboard-section-kicker mb-1">Workspace overview</p>
            <h3 class="type-section-title text-slate-950 dark:text-slate-100">Spaces at a Glance</h3>
            <p class="type-body-sm type-muted mt-1">Compare every space side by side before drilling down.</p>
          </div>
          <span class="type-pill rounded-full border border-indigo-400/25 bg-indigo-500/10 px-3 py-1 text-indigo-700 dark:text-indigo-200">
            {{ spaceCount }} active spaces
          </span>
        </div>

        <div class="mb-5 dashboard-chart-panel">
          <DashboardBarChart
            title="Open tasks by space"
            :items="spaceOpenBarItems"
            empty-label="No spaces to chart yet."
          />
        </div>

        <div class="dashboard-feature-cards-grid">
          <div
            v-for="space in stats.spaceStats"
            :key="space.id"
            class="neon-space-progress-card dashboard-feature-space-card flex h-full flex-col rounded-2xl"
            :style="rowColorStyle(space)"
          >
            <div class="dashboard-progress-card-head mb-3">
              <span
                class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-sm font-black text-white shadow-md"
                :style="{ background: space.color || '#6366f1' }"
              >
                {{ space.name?.slice(0, 1)?.toUpperCase() || 'S' }}
              </span>
              <div class="min-w-0 flex-1">
                <strong class="dashboard-progress-card-title type-card-title text-slate-900 dark:text-slate-100">{{ space.name }}</strong>
                <p class="type-caption type-muted mt-1">{{ space.listCount }} lists · {{ space.total }} tasks</p>
              </div>
            </div>

            <div class="dashboard-progress-card-completion">
              <div>
                <strong class="type-stat-md text-slate-900 dark:text-slate-100">{{ space.completionRate }}%</strong>
                <span class="type-badge type-muted ml-1.5">complete</span>
              </div>
              <span class="type-body-sm type-muted shrink-0 font-semibold">
                {{ space.total ? `${space.done} / ${space.total} done` : 'No tasks yet' }}
              </span>
            </div>

            <div class="type-body-sm type-muted mb-1.5 flex items-center justify-between gap-2 font-semibold">
              <span>Progress</span>
              <span v-if="space.total">{{ space.completionRate }}%</span>
            </div>
            <div class="neon-progress-track mb-4 h-3.5 overflow-hidden rounded-full" :style="rowColorStyle(space)">
              <span class="block h-full rounded-full" :style="{ width: `${space.completionRate}%`, background: space.color || '#6366f1' }"></span>
            </div>

            <div class="dashboard-progress-card-stats">
              <div class="dashboard-progress-stat dashboard-progress-stat--open">
                <span class="dashboard-progress-stat-value">{{ space.open }}</span>
                <span class="dashboard-progress-stat-label type-muted">Open</span>
              </div>
              <div class="dashboard-progress-stat dashboard-progress-stat--done">
                <span class="dashboard-progress-stat-value">{{ space.done }}</span>
                <span class="dashboard-progress-stat-label type-muted">Done</span>
              </div>
              <div class="dashboard-progress-stat dashboard-progress-stat--late" :class="{ 'is-zero': !space.overdue }">
                <span class="dashboard-progress-stat-value">{{ space.overdue || 0 }}</span>
                <span class="dashboard-progress-stat-label type-muted">Late</span>
              </div>
            </div>
          </div>
        </div>
        <p v-if="!stats.spaceStats?.length" class="text-sm text-slate-500">No spaces yet. Create one from the Spaces tab.</p>
      </article>
    </template>

    <!-- SPACE: lists-first layout -->
    <template v-else>
      <article class="dashboard-card dashboard-feature-card dashboard-space-feature rounded-2xl" :style="spaceThemeStyle">
        <div class="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="dashboard-section-kicker dashboard-space-breakdown-label mb-1">Inside this space</p>
            <h3 class="type-section-title text-slate-950 dark:text-slate-100">Lists in {{ space?.name || 'Space' }}</h3>
            <p class="type-body-sm type-muted mt-1">Track each list/project inside this space only.</p>
          </div>
          <span v-if="focusList" class="dashboard-space-stat-pill type-pill rounded-full border px-3 py-1">
            Busiest: {{ focusList.name }} ({{ focusList.open }} open)
          </span>
        </div>

        <div class="mb-5 dashboard-chart-panel">
          <DashboardBarChart
            title="Open tasks by list"
            :items="listOpenBarItems"
            empty-label="No lists to chart yet."
          />
        </div>

        <div class="dashboard-feature-cards-grid">
          <div
            v-for="list in stats.listStats"
            :key="list.id"
            class="neon-space-progress-card dashboard-feature-space-card flex h-full flex-col rounded-2xl"
            :style="spaceThemeStyle"
          >
            <div class="dashboard-progress-card-head mb-3">
              <span class="dashboard-space-list-dot grid h-12 w-12 shrink-0 place-items-center rounded-2xl">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 7h16M4 12h10M4 17h7" />
                </svg>
              </span>
              <div class="min-w-0 flex-1">
                <strong class="dashboard-progress-card-title type-card-title text-slate-900 dark:text-slate-100">{{ list.name }}</strong>
                <p class="type-caption type-muted mt-1">{{ list.total }} tasks in list</p>
              </div>
            </div>

            <div class="dashboard-progress-card-completion">
              <div>
                <strong class="type-stat-md text-slate-900 dark:text-slate-100">{{ list.completionRate }}%</strong>
                <span class="type-badge type-muted ml-1.5">complete</span>
              </div>
              <span class="type-body-sm type-muted shrink-0 font-semibold">
                {{ list.total ? `${list.done} / ${list.total} done` : 'No tasks yet' }}
              </span>
            </div>

            <div class="type-body-sm type-muted mb-1.5 flex items-center justify-between gap-2 font-semibold">
              <span>Progress</span>
              <span v-if="list.total">{{ list.completionRate }}%</span>
            </div>
            <div class="neon-progress-track mb-4 h-3.5 overflow-hidden rounded-full" :style="spaceThemeStyle">
              <span class="block h-full rounded-full" :style="{ width: `${list.completionRate}%`, background: spaceAccentColor }"></span>
            </div>

            <div class="dashboard-progress-card-stats">
              <div class="dashboard-progress-stat dashboard-progress-stat--open">
                <span class="dashboard-progress-stat-value">{{ list.open }}</span>
                <span class="dashboard-progress-stat-label type-muted">Open</span>
              </div>
              <div class="dashboard-progress-stat dashboard-progress-stat--done">
                <span class="dashboard-progress-stat-value">{{ list.done }}</span>
                <span class="dashboard-progress-stat-label type-muted">Done</span>
              </div>
              <div class="dashboard-progress-stat dashboard-progress-stat--late" :class="{ 'is-zero': !list.overdue }">
                <span class="dashboard-progress-stat-value">{{ list.overdue || 0 }}</span>
                <span class="dashboard-progress-stat-label type-muted">Late</span>
              </div>
            </div>
          </div>
        </div>
        <p v-if="!stats.listStats?.length" class="text-sm text-slate-500">No lists in this space yet.</p>
      </article>
    </template>

    <div class="dashboard-analytics-grid dashboard-analytics-grid--pair">
      <article class="dashboard-card dashboard-analytics-card rounded-2xl">
        <div class="mb-3 flex items-start justify-between gap-3">
          <div class="flex min-w-0 items-start gap-2.5">
            <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-500/10 text-indigo-600 ring-1 ring-indigo-500/15">
              <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 3v18h18" />
                <path d="M7 14l4-4 3 3 5-6" />
              </svg>
            </span>
            <div class="min-w-0">
              <h3 class="type-card-title text-slate-950 dark:text-slate-100">
                {{ isHomeScope ? 'All Tasks by Status' : 'This Space by Status' }}
              </h3>
              <p class="type-body-sm type-muted">
                {{ isHomeScope ? 'Workload across your entire workspace' : 'Status mix for this space only' }}
              </p>
            </div>
          </div>
          <span class="type-pill rounded-full border border-indigo-400/25 bg-indigo-500/15 px-3 py-1 text-indigo-700 dark:text-indigo-200">{{ stats.totalTasks || 0 }} total</span>
        </div>

        <DashboardDonutChart
          :segments="statusChartSegments"
          center-label="Tasks"
          empty-label="No task data yet."
        />
      </article>

      <article class="dashboard-card dashboard-analytics-card rounded-2xl">
        <div class="mb-3 flex items-start gap-2.5">
          <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/15">
            <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7L2 9.4h7.6z" />
            </svg>
          </span>
          <div>
            <h3 class="type-card-title text-slate-950 dark:text-slate-100">
              {{ isHomeScope ? 'Workspace Priorities' : 'Space Priorities' }}
            </h3>
            <p class="type-body-sm type-muted">
              {{ isHomeScope ? 'Urgent work across all spaces' : 'Urgent work in this space' }}
            </p>
          </div>
        </div>

        <DashboardDonutChart
          :segments="priorityChartSegments"
          center-label="Priority"
          empty-label="No priority data yet."
        />
      </article>
    </div>

    <div class="grid gap-5 xl:grid-cols-2">
      <article class="dashboard-card rounded-2xl">
        <div class="mb-4 flex items-center gap-3">
          <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-600 ring-1 ring-violet-500/15">
            <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </span>
          <div>
            <h3 class="type-card-title text-slate-950 dark:text-slate-100">
              {{ isHomeScope ? 'Upcoming Across Workspace' : 'Upcoming in This Space' }}
            </h3>
            <p class="type-caption type-muted">
              {{ isHomeScope ? 'Deadlines from every space' : 'Deadlines from lists in this space' }}
            </p>
          </div>
        </div>

        <ul class="space-y-2">
          <li
            v-for="task in stats.upcomingDeadlines"
            :key="task.id"
            class="neon-dash-hover-row neon-inbox flex items-center justify-between gap-3 px-3.5 py-3"
          >
            <div class="min-w-0">
              <span class="type-task-title block truncate text-slate-800 dark:text-slate-100">{{ task.title }}</span>
              <small class="type-meta mt-0.5 block truncate text-indigo-600 dark:text-indigo-300">
                {{ taskLocation(task, isHomeScope ? 'full' : 'list') }}
              </small>
            </div>
            <small class="type-pill shrink-0 rounded-lg bg-violet-50 px-2 py-1 text-violet-700 ring-1 ring-violet-100 dark:bg-violet-500/20 dark:text-violet-200 dark:ring-violet-400/30">
              {{ formatDate(task.due_date) }}
            </small>
          </li>
        </ul>
        <p v-if="!stats.upcomingDeadlines?.length" class="text-sm text-slate-500">No upcoming deadlines yet.</p>
      </article>

      <article class="dashboard-card rounded-2xl">
        <div class="mb-4 flex items-center gap-3">
          <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-fuchsia-500/10 text-fuchsia-600 ring-1 ring-fuchsia-500/15">
            <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 8v5l3 2" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </span>
          <div>
            <h3 class="type-card-title text-slate-950 dark:text-slate-100">
              {{ isHomeScope ? 'Latest Workspace Activity' : 'Latest Space Activity' }}
            </h3>
            <p class="type-caption type-muted">
              {{ isHomeScope ? 'Recent updates from any space' : 'Recent updates in this space' }}
            </p>
          </div>
        </div>

        <ul class="space-y-2">
          <li
            v-for="task in stats.latestActivity"
            :key="task.id"
            class="neon-dash-hover-row flex items-center justify-between gap-3 px-3 py-2.5"
            :class="statusNeonClass(task.status)"
          >
            <div class="min-w-0">
              <span class="type-task-title block truncate text-slate-800 dark:text-slate-100">{{ task.title }}</span>
              <small class="type-meta mt-0.5 block truncate opacity-80">
                {{ taskLocation(task, isHomeScope ? 'full' : 'list') }}
              </small>
            </div>
            <small
              class="type-badge shrink-0 rounded-full px-2.5 py-1 uppercase tracking-wide ring-1"
              :class="statusPillTone(task.status)"
            >
              {{ task.status.replace('_', ' ') }}
            </small>
          </li>
        </ul>
        <p v-if="!stats.latestActivity?.length" class="text-sm text-slate-500">No activity yet.</p>
      </article>
    </div>
  </section>
</template>
