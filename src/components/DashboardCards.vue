<script setup>
const props = defineProps({
  stats: {
    type: Object,
    required: true,
  },
  title: {
    type: String,
    default: 'Dashboard',
  },
})

const statCards = [
  { key: 'openTasks', label: 'Open tasks', tone: 'text-slate-950' },
  { key: 'overdue', label: 'Overdue', tone: 'text-rose-600' },
  { key: 'totalTasks', label: 'Total tasks', tone: 'text-slate-950' },
  { key: 'completionRate', label: 'Completion', tone: 'text-emerald-700', suffix: '%' },
]

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

function percent(count) {
  return `${Math.round((count / Math.max(props.stats.totalTasks || 0, 1)) * 100)}%`
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
</script>

<template>
  <section class="space-y-4">
    <div class="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h2 class="text-xl font-black tracking-tight text-slate-950">{{ title }}</h2>
        <p class="mt-1 text-sm text-slate-500">Live analytics across your personal Spaces and Lists.</p>
      </div>
      <span class="inline-flex w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-700">
        Live summary
      </span>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <article
        v-for="card in statCards"
        :key="card.key"
        class="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
      >
        <p class="text-xs font-extrabold uppercase tracking-wide text-slate-500">{{ card.label }}</p>
        <p class="mt-3 text-4xl font-black tracking-tight" :class="card.tone">
          {{ stats[card.key] ?? 0 }}{{ card.suffix || '' }}
        </p>
      </article>
    </div>

    <div class="grid gap-4 xl:grid-cols-[2fr_1fr_1fr]">
      <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="mb-5 flex items-center justify-between gap-4">
          <div>
            <h3 class="text-base font-black text-slate-950">Task Distribution by Status</h3>
            <p class="text-sm text-slate-500">Live workload split</p>
          </div>
          <span class="text-sm font-bold text-slate-400">{{ stats.totalTasks || 0 }} total</span>
        </div>

        <div class="space-y-4">
          <div v-for="(count, status) in stats.statusCounts" :key="status" class="grid grid-cols-[110px_1fr_36px] items-center gap-3">
            <span class="text-sm font-bold text-slate-600">{{ statusLabels[status] || status }}</span>
            <div class="h-3 overflow-hidden rounded-full bg-slate-100">
              <div class="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400" :style="{ width: percent(count) }"></div>
            </div>
            <strong class="text-right text-sm text-slate-800">{{ count }}</strong>
          </div>

          <p v-if="!Object.keys(stats.statusCounts || {}).length" class="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
            No task data yet.
          </p>
        </div>
      </article>

      <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 class="text-base font-black text-slate-950">Overall Progress</h3>
        <div class="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
          <span class="block h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400" :style="{ width: `${stats.completionRate || 0}%` }"></span>
        </div>
        <p class="mt-4 text-sm text-slate-500">{{ stats.completionRate || 0 }}% of tracked work is complete.</p>
        <div class="mt-5 grid grid-cols-2 gap-3">
          <div class="rounded-xl bg-slate-50 p-3">
            <span class="text-xs font-bold uppercase text-slate-400">Done</span>
            <strong class="block text-xl text-slate-950">{{ stats.doneTasks || 0 }}</strong>
          </div>
          <div class="rounded-xl bg-slate-50 p-3">
            <span class="text-xs font-bold uppercase text-slate-400">This week</span>
            <strong class="block text-xl text-slate-950">{{ stats.completedThisWeek || 0 }}</strong>
          </div>
        </div>
      </article>

      <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 class="text-base font-black text-slate-950">Priority Mix</h3>
        <div class="mt-5 grid grid-cols-2 gap-3">
          <div
            v-for="(count, priority) in stats.priorityCounts"
            :key="priority"
            class="rounded-xl bg-slate-50 p-3"
          >
            <span class="block text-sm capitalize text-slate-500">{{ priorityLabels[priority] || priority }}</span>
            <strong class="mt-1 block text-2xl text-slate-950">{{ count }}</strong>
          </div>
        </div>
      </article>
    </div>

    <div class="grid gap-4 xl:grid-cols-[1.1fr_1fr_1.2fr]">
      <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 class="mb-4 text-base font-black text-slate-950">Upcoming Deadlines</h3>
        <ul class="space-y-3">
          <li
            v-for="task in stats.upcomingDeadlines"
            :key="task.id"
            class="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
          >
            <span class="truncate text-sm font-bold text-slate-800">{{ task.title }}</span>
            <small class="shrink-0 text-xs text-slate-500">{{ formatDate(task.due_date) }}</small>
          </li>
        </ul>
        <p v-if="!stats.upcomingDeadlines?.length" class="text-sm text-slate-500">No upcoming deadlines yet.</p>
      </article>

      <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 class="mb-4 text-base font-black text-slate-950">Spaces Progress</h3>
        <div class="space-y-4">
          <div v-for="space in stats.spaceStats" :key="space.id">
            <div class="mb-2 flex items-center justify-between gap-3">
              <span class="text-sm font-bold text-slate-800">{{ space.name }}</span>
              <strong class="text-sm text-slate-500">{{ space.completionRate }}%</strong>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-slate-100">
              <span class="block h-full rounded-full bg-emerald-500" :style="{ width: `${space.completionRate}%` }"></span>
            </div>
            <p class="mt-1 text-xs text-slate-400">{{ space.open }} open · {{ space.listCount }} lists</p>
          </div>
        </div>
      </article>

      <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 class="mb-4 text-base font-black text-slate-950">Latest Activity</h3>
        <ul class="space-y-3">
          <li
            v-for="task in stats.latestActivity"
            :key="task.id"
            class="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
          >
            <span class="truncate text-sm font-bold text-slate-800">{{ task.title }}</span>
            <small class="shrink-0 text-xs capitalize text-slate-500">{{ task.status.replace('_', ' ') }}</small>
          </li>
        </ul>
        <p v-if="!stats.latestActivity?.length" class="text-sm text-slate-500">No activity yet.</p>
      </article>
    </div>

    <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="mb-4 flex items-center justify-between gap-4">
        <h3 class="text-base font-black text-slate-950">List Breakdown</h3>
        <span class="text-sm text-slate-500">{{ stats.listStats?.length || 0 }} lists</span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr class="border-b border-slate-100 text-xs font-black uppercase tracking-wide text-slate-400">
              <th class="py-3">List</th>
              <th class="py-3">Total</th>
              <th class="py-3">Open</th>
              <th class="py-3">Done</th>
              <th class="py-3">Overdue</th>
              <th class="py-3">Completion</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="list in stats.listStats" :key="list.id" class="border-b border-slate-100 last:border-0">
              <td class="py-3 text-sm font-bold text-slate-800">{{ list.name }}</td>
              <td class="py-3 text-sm text-slate-600">{{ list.total }}</td>
              <td class="py-3 text-sm text-slate-600">{{ list.open }}</td>
              <td class="py-3 text-sm text-emerald-700">{{ list.done }}</td>
              <td class="py-3 text-sm text-rose-600">{{ list.overdue }}</td>
              <td class="py-3">
                <div class="flex items-center gap-3">
                  <div class="h-2 w-28 overflow-hidden rounded-full bg-slate-100">
                    <span class="block h-full rounded-full bg-emerald-500" :style="{ width: `${list.completionRate}%` }"></span>
                  </div>
                  <span class="text-xs font-bold text-slate-500">{{ list.completionRate }}%</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="!stats.listStats?.length" class="text-sm text-slate-500">No lists yet.</p>
    </article>
  </section>
</template>
