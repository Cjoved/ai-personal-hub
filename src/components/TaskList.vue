<script setup>
import { computed, ref } from 'vue'
import AppSelect from './AppSelect.vue'
import { getStatusNeon } from '../composables/statusNeon'
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
  createSubtask: {
    type: Function,
    required: true,
  },
  updateSubtask: {
    type: Function,
    required: true,
  },
  deleteSubtask: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits(['update-task', 'archive-task', 'restore-task', 'delete-task', 'edit-task'])

const expandedTaskIds = ref(new Set())
const subtaskDrafts = ref({})
const savingSubtaskIds = ref(new Set())

const groupTone = {
  inbox: 'border-l-indigo-400',
  todo: 'border-l-violet-400',
  in_progress: 'border-l-cyan-400',
  done: 'border-l-emerald-400',
  archived: 'border-l-fuchsia-400/70',
}

const statusPill = {
  inbox: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200',
  todo: 'bg-violet-50 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200',
  in_progress: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-200',
  done: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200',
  archived: 'bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-500/15 dark:text-fuchsia-200',
}

const statusDot = {
  inbox: 'bg-indigo-400 shadow-[0_0_10px_rgb(129_140_248/0.75)]',
  todo: 'bg-violet-400 shadow-[0_0_10px_rgb(167_139_250/0.75)]',
  in_progress: 'bg-cyan-400 shadow-[0_0_10px_rgb(34_211_238/0.75)]',
  done: 'bg-emerald-400 shadow-[0_0_10px_rgb(52_211_153/0.75)]',
  archived: 'bg-fuchsia-400/70 shadow-[0_0_8px_rgb(232_121_249/0.5)]',
}

const priorityPill = {
  urgent: 'border-rose-200/80 bg-rose-50 text-rose-700',
  high: 'border-orange-200/80 bg-orange-50 text-orange-700',
  normal: 'border-amber-200/80 bg-amber-50 text-amber-800',
  low: 'border-sky-200/80 bg-sky-50 text-sky-700',
}

const statusSelectPill = {
  inbox: 'border-indigo-200/80 bg-indigo-50 text-indigo-700 dark:border-indigo-400/40 dark:bg-indigo-500/15 dark:text-indigo-200',
  todo: 'border-violet-200/80 bg-violet-50 text-violet-700 dark:border-violet-400/40 dark:bg-violet-500/15 dark:text-violet-200',
  in_progress: 'border-cyan-200/80 bg-cyan-50 text-cyan-700 dark:border-cyan-400/40 dark:bg-cyan-500/15 dark:text-cyan-200',
  done: 'border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200',
  archived: 'border-fuchsia-200/80 bg-fuchsia-50 text-fuchsia-600 dark:border-fuchsia-400/35 dark:bg-fuchsia-500/12 dark:text-fuchsia-200',
}

const actionBtn = {
  edit: 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-400/40 dark:bg-sky-500/15 dark:text-sky-200 dark:hover:bg-sky-500/25',
  archive: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-200 dark:hover:bg-amber-500/25',
  delete: 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-200 dark:hover:bg-rose-500/25',
}

const subtaskStatusTone = {
  todo: 'border-violet-200/80 bg-violet-50 text-violet-700 dark:border-violet-400/40 dark:bg-violet-500/15 dark:text-violet-200',
  in_progress: 'border-cyan-200/80 bg-cyan-50 text-cyan-700 dark:border-cyan-400/40 dark:bg-cyan-500/15 dark:text-cyan-200',
  done: 'border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200',
}

const subtaskStatusOptions = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
]

function neon(status) {
  return getStatusNeon(status)
}

function statusTone(value) {
  return statusSelectPill[value] || statusSelectPill.inbox
}

function priorityTone(value) {
  return priorityPill[value] || priorityPill.normal
}

function subtaskTone(value) {
  return subtaskStatusTone[value] || subtaskStatusTone.todo
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

function isExpanded(taskId) {
  return expandedTaskIds.value.has(taskId)
}

function toggleTask(taskId) {
  const next = new Set(expandedTaskIds.value)
  if (next.has(taskId)) next.delete(taskId)
  else next.add(taskId)
  expandedTaskIds.value = next
}

async function submitSubtask(task) {
  const title = subtaskDrafts.value[task.id]?.trim()
  if (!title || savingSubtaskIds.value.has(task.id)) return

  savingSubtaskIds.value = new Set(savingSubtaskIds.value).add(task.id)
  const didCreate = await props.createSubtask(task.id, title)

  if (didCreate) {
    subtaskDrafts.value = {
      ...subtaskDrafts.value,
      [task.id]: '',
    }
  }

  const nextSaving = new Set(savingSubtaskIds.value)
  nextSaving.delete(task.id)
  savingSubtaskIds.value = nextSaving
}

function toggleSubtaskDone(subtask, isChecked) {
  props.updateSubtask(subtask.id, { status: isChecked ? 'done' : 'todo' })
}
</script>

<template>
  <section class="space-y-4">
    <header class="shell-header relative overflow-hidden rounded-2xl p-4 sm:p-5">
      <div class="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500"></div>
      <div class="flex flex-wrap items-center gap-3">
        <span class="grid h-9 w-9 place-items-center rounded-xl bg-indigo-500/10 text-indigo-600 ring-1 ring-indigo-500/15">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 7h16M4 12h10M4 17h7" />
          </svg>
        </span>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-lg font-black text-slate-950 sm:text-xl">{{ title }}</h2>
            <span class="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200">{{ tasks.length }} tasks</span>
            <span class="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">{{ tasks.filter((task) => task.status !== 'done').length }} open</span>
          </div>
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
        class="status-neon-zone dashboard-card overflow-hidden rounded-2xl border-l-4"
        :class="[groupTone[group.value], neon(group.value).border]"
      >
        <header class="flex items-center justify-between gap-4 px-4 py-3" :class="neon(group.value).header">
          <div class="flex items-center gap-3">
            <span class="h-2.5 w-2.5 rounded-full ring-2 ring-white/80 dark:ring-slate-900/50" :class="statusDot[group.value]"></span>
            <h3 class="type-column-title uppercase tracking-wide" :class="neon(group.value).title">{{ group.label }}</h3>
            <span class="rounded-full px-2 py-0.5 text-xs font-bold" :class="neon(group.value).badge">
              {{ group.tasks.length }}
            </span>
          </div>
        </header>

        <div class="task-table-wrap md:overflow-x-auto">
          <table class="task-table w-full border-collapse text-left md:min-w-[900px]">
            <thead>
              <tr class="type-table-head" :class="neon(group.value).thead">
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
              <template v-for="(task, rowIndex) in group.tasks" :key="task.id">
                <tr
                  class="task-row transition"
                  :class="rowIndex % 2 === 1 ? neon(group.value).rowAlt : neon(group.value).row"
                >
                  <td class="px-4 py-3.5 align-middle">
                    <div class="flex items-center gap-2">
                      <button
                        class="grid h-7 w-7 place-items-center rounded-lg transition"
                        :class="neon(group.value).iconBtn"
                        type="button"
                        :aria-label="isExpanded(task.id) ? 'Collapse subtasks' : 'Expand subtasks'"
                        @click="toggleTask(task.id)"
                      >
                        <svg
                          class="h-3.5 w-3.5 transition-transform"
                          :class="isExpanded(task.id) ? 'rotate-90' : ''"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                        >
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      </button>
                      <input
                        class="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20"
                        type="checkbox"
                        :checked="task.status === 'done'"
                        @change="toggleDone(task, $event.target.checked)"
                      />
                    </div>
                  </td>

                  <td class="max-w-[360px] px-4 py-3.5 align-middle">
                    <button class="block w-full text-left" type="button" @click="emit('edit-task', task)">
                      <span class="flex min-w-0 items-center gap-2">
                        <span class="type-task-title truncate text-slate-950 dark:text-slate-100">{{ task.title }}</span>
                        <span
                          v-if="task.subtaskCount"
                          class="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-600 ring-1 ring-indigo-100"
                        >
                          {{ task.completedSubtaskCount }}/{{ task.subtaskCount }}
                        </span>
                      </span>
                      <span v-if="task.description" class="type-caption type-muted mt-1 line-clamp-1">
                        {{ task.description }}
                      </span>
                    </button>
                  </td>

                  <td class="px-4 py-3.5 align-middle" data-label="Status">
                    <AppSelect
                      :model-value="task.status"
                      :options="statusOptions"
                      :option-tone="statusTone"
                      aria-label="Update status"
                      @update:model-value="emit('update-task', task.id, { status: $event })"
                    />
                  </td>

                  <td class="max-w-[220px] px-4 py-3.5 align-middle" data-label="Location">
                    <span class="inline-flex max-w-full truncate rounded-lg px-2.5 py-1 text-[11px] font-semibold" :class="neon(group.value).location">
                      {{ formatLocation(task) }}
                    </span>
                  </td>

                  <td class="px-4 py-3.5 align-middle" data-label="Priority">
                    <AppSelect
                      :model-value="task.priority"
                      :options="priorityOptions"
                      :option-tone="priorityTone"
                      aria-label="Update priority"
                      @update:model-value="emit('update-task', task.id, { priority: $event })"
                    />
                  </td>

                  <td class="px-4 py-3.5 align-middle" data-label="Due date">
                    <span class="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-100">
                      <svg class="h-3 w-3 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <path d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                      {{ formatDate(task.due_date) }}
                    </span>
                  </td>

                  <td class="px-4 py-3.5 align-middle">
                    <div class="flex justify-end gap-1.5">
                      <button
                        class="grid h-8 w-8 place-items-center rounded-lg border transition"
                        :class="actionBtn.edit"
                        type="button"
                        title="Edit"
                        aria-label="Edit task"
                        @click="emit('edit-task', task)"
                      >
                        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </button>
                      <button
                        v-if="task.status === 'archived'"
                        class="grid h-8 w-8 place-items-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100"
                        type="button"
                        title="Restore"
                        aria-label="Restore task"
                        @click="emit('restore-task', task.id)"
                      >
                        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M3 12a9 9 0 1 0 9-9" />
                          <path d="M3 3v6h6" />
                        </svg>
                      </button>
                      <button
                        v-else
                        class="grid h-8 w-8 place-items-center rounded-lg border transition"
                        :class="actionBtn.archive"
                        type="button"
                        title="Archive"
                        aria-label="Archive task"
                        @click="emit('archive-task', task.id)"
                      >
                        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="3" y="4" width="18" height="4" rx="1" />
                          <path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
                          <path d="M10 12h4" />
                        </svg>
                      </button>
                      <button
                        class="grid h-8 w-8 place-items-center rounded-lg border transition"
                        :class="actionBtn.delete"
                        type="button"
                        title="Delete"
                        aria-label="Delete task"
                        @click="emit('delete-task', task.id)"
                      >
                        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>

                <tr v-if="isExpanded(task.id)" class="task-subtasks-row" :class="neon(group.value).rowAlt">
                  <td></td>
                  <td colspan="6" class="px-4 py-3">
                    <div class="space-y-2 rounded-xl p-3" :class="neon(group.value).subtaskPanel">
                      <div
                        v-for="subtask in task.subtasks"
                        :key="subtask.id"
                        class="neon-subtask-row grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg px-2 py-1.5 transition"
                      >
                        <label class="flex min-w-0 items-center gap-3 text-sm font-medium text-slate-700">
                          <input
                            class="h-4 w-4 rounded border-slate-300 text-emerald-600"
                            type="checkbox"
                            :checked="subtask.status === 'done'"
                            @change="toggleSubtaskDone(subtask, $event.target.checked)"
                          />
                          <span class="truncate" :class="subtask.status === 'done' ? 'text-slate-400 line-through' : ''">
                            {{ subtask.title }}
                          </span>
                        </label>

                        <AppSelect
                          :model-value="subtask.status"
                          :options="subtaskStatusOptions"
                          :option-tone="subtaskTone"
                          aria-label="Update subtask status"
                          @update:model-value="props.updateSubtask(subtask.id, { status: $event })"
                        />

                        <button
                          class="grid h-7 w-7 place-items-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                          type="button"
                          title="Delete subtask"
                          aria-label="Delete subtask"
                          @click="props.deleteSubtask(subtask.id)"
                        >
                          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                          </svg>
                        </button>
                      </div>

                      <p v-if="!task.subtasks?.length" class="px-2 py-1 text-sm text-slate-400">
                        No subtasks yet.
                      </p>

                      <form class="flex gap-2 border-t pt-3" :style="{ borderColor: 'var(--neon-border)' }" @submit.prevent="submitSubtask(task)">
                        <input
                          v-model.trim="subtaskDrafts[task.id]"
                          class="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-600 dark:bg-slate-900/80 dark:text-slate-100"
                          :style="{ borderColor: 'var(--neon-border)' }"
                          placeholder="+ Add subtask..."
                        />
                        <button
                          class="rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-3 py-2 text-sm font-extrabold text-white shadow-[0_0_14px_rgb(99_102_241/0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                          type="submit"
                          :disabled="savingSubtaskIds.has(task.id) || !subtaskDrafts[task.id]?.trim()"
                        >
                          Add
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <div v-else class="dashboard-card rounded-2xl border border-dashed border-slate-300 p-10 text-center">
      <p class="text-base font-semibold text-slate-700">No tasks here yet.</p>
      <p class="mt-2 text-sm text-slate-500">Use the <strong>+</strong> button above to add a task, or try a different filter.</p>
    </div>
  </section>
</template>
