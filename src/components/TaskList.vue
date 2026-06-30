<script setup>
import { computed } from 'vue'
import { priorityOptions, statusOptions } from '../composables/useTasks'

const props = defineProps({
  tasks: {
    type: Array,
    required: true,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  errorMessage: {
    type: String,
    default: '',
  },
  title: {
    type: String,
    default: 'Tasks',
  },
})

const emit = defineEmits(['update-task', 'archive-task', 'delete-task', 'edit-task'])

const groupTone = {
  inbox: 'border-l-indigo-500',
  todo: 'border-l-slate-500',
  in_progress: 'border-l-sky-500',
  done: 'border-l-emerald-500',
  archived: 'border-l-slate-300',
}

const statusPill = {
  inbox: 'bg-indigo-50 text-indigo-700',
  todo: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-sky-50 text-sky-700',
  done: 'bg-emerald-50 text-emerald-700',
  archived: 'bg-slate-100 text-slate-500',
}

const priorityPill = {
  urgent: 'bg-rose-50 text-rose-700',
  high: 'bg-orange-50 text-orange-700',
  normal: 'bg-amber-50 text-amber-700',
  low: 'bg-sky-50 text-sky-700',
}

const taskGroups = computed(() =>
  statusOptions
    .map((status) => ({
      ...status,
      tasks: props.tasks.filter((task) => task.status === status.value),
    }))
    .filter((group) => group.tasks.length),
)

function formatDate(value) {
  if (!value) return 'Set date'

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

function formatLocation(task) {
  if (task.space?.name && task.list?.name) return `${task.space.name} / ${task.list.name}`
  if (task.space?.name) return task.space.name
  return 'No location'
}

function toggleDone(task, isChecked) {
  emit('update-task', task.id, { status: isChecked ? 'done' : 'todo' })
}
</script>

<template>
  <section class="space-y-4">
    <header class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div class="flex items-center gap-3">
            <span class="h-3 w-3 rounded-full bg-indigo-500"></span>
            <h2 class="text-xl font-black text-slate-950">{{ title }}</h2>
            <span class="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">Active</span>
          </div>
          <p class="mt-1 text-sm text-slate-500">
            {{ tasks.length }} tasks · {{ tasks.filter((task) => task.status !== 'done').length }} open ·
            {{ tasks.filter((task) => task.due_date).length }} with due date
          </p>
        </div>
      </div>
    </header>

    <p v-if="errorMessage" class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
      {{ errorMessage }}
    </p>

    <div v-if="isLoading" class="space-y-3">
      <div v-for="index in 4" :key="index" class="h-24 animate-pulse rounded-2xl bg-slate-100"></div>
    </div>

    <template v-else-if="taskGroups.length">
      <section
        v-for="group in taskGroups"
        :key="group.value"
        class="overflow-hidden rounded-2xl border border-slate-200 border-l-4 bg-white shadow-sm"
        :class="groupTone[group.value]"
      >
        <header class="flex items-center justify-between gap-4 border-b border-slate-100 bg-white px-4 py-3">
          <div class="flex items-center gap-3">
            <button class="text-slate-400" type="button" aria-label="Group expanded">⌄</button>
            <span class="h-2.5 w-2.5 rounded-full" :class="statusPill[group.value]"></span>
            <h3 class="text-sm font-black uppercase tracking-wide text-slate-800">{{ group.label }}</h3>
            <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">
              {{ group.tasks.length }}
            </span>
          </div>

          <span class="text-lg text-slate-300">+</span>
        </header>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr class="border-b border-slate-100 bg-slate-50/70 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                <th class="w-10 px-4 py-3"></th>
                <th class="px-4 py-3">Task</th>
                <th class="px-4 py-3">Status</th>
                <th class="px-4 py-3">Location</th>
                <th class="px-4 py-3">Priority</th>
                <th class="px-4 py-3">Due date</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="task in group.tasks"
                :key="task.id"
                class="border-b border-slate-100 last:border-0 hover:bg-slate-50/80"
              >
                <td class="px-4 py-3 align-top">
                  <input
                    class="h-4 w-4 rounded border-slate-300 text-emerald-600"
                    type="checkbox"
                    :checked="task.status === 'done'"
                    @change="toggleDone(task, $event.target.checked)"
                  />
                </td>

                <td class="max-w-[360px] px-4 py-3 align-top">
                  <button class="block w-full text-left" type="button" @click="emit('edit-task', task)">
                    <span class="block truncate text-sm font-bold text-slate-950">{{ task.title }}</span>
                    <span v-if="task.description" class="mt-1 line-clamp-1 text-xs text-slate-500">
                      {{ task.description }}
                    </span>
                  </button>
                </td>

                <td class="px-4 py-3 align-top">
                  <select
                    class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    :value="task.status"
                    aria-label="Update status"
                    @change="emit('update-task', task.id, { status: $event.target.value })"
                  >
                    <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </td>

                <td class="max-w-[220px] px-4 py-3 align-top">
                  <span class="block truncate text-xs font-semibold text-slate-500">{{ formatLocation(task) }}</span>
                </td>

                <td class="px-4 py-3 align-top">
                  <select
                    class="rounded-full border border-transparent px-3 py-1.5 text-xs font-bold capitalize outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    :class="priorityPill[task.priority] || priorityPill.normal"
                    :value="task.priority"
                    aria-label="Update priority"
                    @change="emit('update-task', task.id, { priority: $event.target.value })"
                  >
                    <option v-for="option in priorityOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </td>

                <td class="px-4 py-3 align-top">
                  <span class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500">
                    {{ formatDate(task.due_date) }}
                  </span>
                </td>

                <td class="px-4 py-3 align-top">
                  <div class="flex justify-end gap-2">
                    <button
                      class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                      type="button"
                      @click="emit('edit-task', task)"
                    >
                      Edit
                    </button>
                    <button
                      class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-slate-50"
                      type="button"
                      @click="emit('archive-task', task.id)"
                    >
                      Archive
                    </button>
                    <button
                      class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                      type="button"
                      @click="emit('delete-task', task.id)"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <div v-else class="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
      <p class="text-base font-semibold text-slate-700">No tasks here yet.</p>
      <p class="mt-2 text-sm text-slate-500">Try quick adding a task or switching filters.</p>
    </div>
  </section>
</template>
