<script setup>
import { computed } from 'vue'

const props = defineProps({
  todayTasks: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['edit-task'])

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
</script>

<template>
  <section class="today-tasks-panel dashboard-card rounded-2xl">
    <header class="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="type-kicker text-emerald-600 dark:text-emerald-300">Today</p>
        <h3 class="type-section-title mt-1.5 text-slate-950 dark:text-slate-100">{{ dateLabel }}</h3>
        <p class="type-body-sm type-muted mt-1.5">Tasks due or overdue today across all spaces.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <span v-if="todayTasks.overdue.length" class="rounded-full bg-rose-100 px-3 py-1.5 text-sm font-bold text-rose-700 dark:bg-rose-500/20 dark:text-rose-200">
          {{ todayTasks.overdue.length }} overdue
        </span>
        <span v-if="todayTasks.dueToday.length" class="rounded-full bg-sky-100 px-3 py-1.5 text-sm font-bold text-sky-700 dark:bg-sky-500/20 dark:text-sky-200">
          {{ todayTasks.dueToday.length }} due
        </span>
      </div>
    </header>

    <div v-if="isEmpty" class="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center dark:border-slate-600">
      <p class="type-body font-semibold text-slate-700 dark:text-slate-200">Nothing scheduled for today.</p>
      <p class="type-body-sm type-muted mt-1.5">You're clear — or add due dates to see tasks here.</p>
    </div>

    <template v-else>
      <div v-if="todayTasks.overdue.length" class="mb-5">
        <h4 class="type-body-sm mb-2.5 font-bold uppercase tracking-wide text-rose-600 dark:text-rose-300">Overdue</h4>
        <ul class="space-y-2.5">
          <li
            v-for="task in todayTasks.overdue"
            :key="task.id"
            class="today-task-row today-task-row--overdue"
          >
            <button class="min-w-0 flex-1 text-left" type="button" @click="emit('edit-task', task)">
              <span class="type-body block truncate font-semibold text-slate-900 dark:text-slate-100">{{ task.title }}</span>
              <span class="type-body-sm type-muted mt-0.5 block truncate">{{ locationLabel(task) }}</span>
            </button>
            <span v-if="task.due_date" class="type-body-sm shrink-0 font-semibold text-rose-600 dark:text-rose-300">{{ formatTime(task.due_date) }}</span>
          </li>
        </ul>
      </div>

      <div v-if="todayTasks.dueToday.length" class="mb-5">
        <h4 class="type-body-sm mb-2.5 font-bold uppercase tracking-wide text-sky-600 dark:text-sky-300">Due today</h4>
        <ul class="space-y-2.5">
          <li
            v-for="task in todayTasks.dueToday"
            :key="task.id"
            class="today-task-row"
          >
            <button class="min-w-0 flex-1 text-left" type="button" @click="emit('edit-task', task)">
              <span class="type-body block truncate font-semibold text-slate-900 dark:text-slate-100">{{ task.title }}</span>
              <span class="type-body-sm type-muted mt-0.5 block truncate">{{ locationLabel(task) }}</span>
            </button>
            <span v-if="task.due_date" class="type-body-sm shrink-0 font-semibold text-slate-500">{{ formatTime(task.due_date) }}</span>
          </li>
        </ul>
      </div>

      <div v-if="todayTasks.completedToday.length">
        <h4 class="type-body-sm mb-2.5 font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">Completed today</h4>
        <ul class="space-y-2.5">
          <li
            v-for="task in todayTasks.completedToday"
            :key="task.id"
            class="today-task-row today-task-row--done"
          >
            <button class="min-w-0 flex-1 text-left" type="button" @click="emit('edit-task', task)">
              <span class="type-body block truncate font-semibold text-slate-600 line-through dark:text-slate-400">{{ task.title }}</span>
            </button>
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>
