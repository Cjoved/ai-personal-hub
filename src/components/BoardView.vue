<script setup>
import { ref, toRefs } from 'vue'
import { getStatusNeon, getStatusNeonClass } from '../composables/statusNeon'

const props = defineProps({
  columns: {
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
})

const { columns: boardColumns } = toRefs(props)

const emit = defineEmits(['update-task', 'archive-task', 'delete-task', 'edit-task'])

const columnTone = {
  inbox: 'border-l-indigo-400',
  todo: 'border-l-violet-400',
  in_progress: 'border-l-cyan-400',
  done: 'border-l-emerald-400',
}

const priorityPill = {
  urgent: 'border-rose-200/80 bg-rose-50 text-rose-700 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-200',
  high: 'border-orange-200/80 bg-orange-50 text-orange-700 dark:border-orange-400/40 dark:bg-orange-500/15 dark:text-orange-200',
  normal: 'border-amber-200/80 bg-amber-50 text-amber-800 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-200',
  low: 'border-cyan-200/80 bg-cyan-50 text-cyan-700 dark:border-cyan-400/40 dark:bg-cyan-500/15 dark:text-cyan-200',
}

const actionBtn = {
  edit: 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-400/40 dark:bg-sky-500/15 dark:text-sky-200 dark:hover:bg-sky-500/25',
  done: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200 dark:hover:bg-emerald-500/25',
  archive: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-200 dark:hover:bg-amber-500/25',
  delete: 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-200 dark:hover:bg-rose-500/25',
}

const draggingTaskId = ref(null)
const dropTargetStatus = ref(null)
const expandedTaskIds = ref(new Set())

function toggleSubtasks(taskId) {
  const next = new Set(expandedTaskIds.value)
  if (next.has(taskId)) next.delete(taskId)
  else next.add(taskId)
  expandedTaskIds.value = next
}

function formatLocation(task) {
  if (task.space?.name && task.list?.name) return `${task.space.name} / ${task.list.name}`
  if (task.space?.name) return task.space.name
  return 'No location'
}

function formatDate(value) {
  if (!value) return 'No date'

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

function isOverdue(task) {
  if (!task.due_date || task.status === 'done' || task.status === 'archived') return false
  const dueDate = new Date(task.due_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return dueDate < today
}

function neon(status) {
  return getStatusNeon(status)
}

function neonClass(status) {
  return getStatusNeonClass(status)
}

function handleDragStart(task, event) {
  draggingTaskId.value = task.id
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', task.id)
}

function handleDragEnd() {
  draggingTaskId.value = null
  dropTargetStatus.value = null
}

function handleDragOver(status, event) {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  dropTargetStatus.value = status
}

function handleDragLeave(status) {
  if (dropTargetStatus.value === status) {
    dropTargetStatus.value = null
  }
}

function onColumnDrop(column, event) {
  event.preventDefault()
  const taskId = event.dataTransfer.getData('text/plain') || draggingTaskId.value
  dropTargetStatus.value = null
  draggingTaskId.value = null

  if (!taskId) return

  if (column.tasks.some((task) => task.id === taskId)) return

  for (const col of boardColumns.value) {
    const task = col.tasks.find((item) => item.id === taskId)
    if (task) {
      if (task.status === column.value) return
      emit('update-task', taskId, { status: column.value })
      return
    }
  }
}
</script>

<template>
  <section class="board-view">
    <p v-if="errorMessage" class="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-200">
      {{ errorMessage }}
    </p>

    <p class="type-caption type-muted mb-3">
      Drag cards between columns to update status.
    </p>

    <div v-if="isLoading" class="board-columns">
      <div v-for="index in 4" :key="index" class="board-column h-80 animate-pulse rounded-2xl bg-indigo-500/10"></div>
    </div>

    <div v-else class="board-columns">
      <section
        v-for="column in columns"
        :key="column.value"
        class="board-column status-neon-zone dashboard-card overflow-hidden rounded-2xl border-l-4"
        :class="[
          columnTone[column.value],
          neonClass(column.value),
          dropTargetStatus === column.value ? 'board-column--drop-target' : '',
        ]"
      >
        <header class="board-column-header flex shrink-0 items-center justify-between gap-3 px-3 py-3" :class="neon(column.value).header">
          <div class="flex items-center gap-2">
            <span class="h-2.5 w-2.5 rounded-full ring-2 ring-white/80 dark:ring-slate-900/50" :class="neon(column.value).dot || ''"></span>
            <h3 class="type-column-title" :class="neon(column.value).title">{{ column.label }}</h3>
          </div>
          <span class="type-pill rounded-full px-2.5 py-0.5" :class="neon(column.value).badge">
            {{ column.tasks.length }}
          </span>
        </header>

        <div
          class="board-column-body space-y-3 p-3"
          @dragover="handleDragOver(column.value, $event)"
          @dragleave="handleDragLeave(column.value)"
          @drop="onColumnDrop(column, $event)"
        >
          <article
            v-for="task in column.tasks"
            :key="task.id"
            class="neon-board-card cursor-grab rounded-xl p-3 shadow-sm active:cursor-grabbing"
            :class="draggingTaskId === task.id ? 'neon-board-card--dragging' : ''"
            draggable="true"
            @dragstart="handleDragStart(task, $event)"
            @dragend="handleDragEnd"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex min-w-0 items-center gap-2">
                  <h4 class="type-task-title truncate text-slate-950 dark:text-slate-100">{{ task.title }}</h4>
                  <span
                    v-if="task.subtaskCount"
                    class="type-badge shrink-0 cursor-pointer rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-600 ring-1 ring-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-200 dark:ring-indigo-400/30"
                    title="Toggle subtasks"
                    @click.stop="toggleSubtasks(task.id)"
                  >
                    {{ task.completedSubtaskCount }}/{{ task.subtaskCount }}
                  </span>
                </div>
                <p class="type-meta neon-location mt-1.5 inline-flex max-w-full truncate rounded-lg px-2 py-0.5">
                  {{ formatLocation(task) }}
                </p>
              </div>
              <span
                class="type-badge rounded-full border px-2 py-0.5 uppercase"
                :class="priorityPill[task.priority] || priorityPill.normal"
              >
                {{ task.priority }}
              </span>
            </div>

            <p v-if="task.description" class="type-caption type-muted mt-2 line-clamp-2 leading-relaxed">
              {{ task.description }}
            </p>

            <ul v-if="task.subtaskCount && expandedTaskIds.has(task.id)" class="mt-2 space-y-1 rounded-lg border border-slate-200/80 bg-slate-50/80 p-2 dark:border-slate-700 dark:bg-slate-900/40">
              <li
                v-for="subtask in task.subtasks"
                :key="subtask.id"
                class="type-caption flex items-center gap-2 text-slate-600 dark:text-slate-300"
              >
                <span class="h-1.5 w-1.5 rounded-full" :class="subtask.status === 'done' ? 'bg-emerald-500' : 'bg-slate-400'"></span>
                <span :class="subtask.status === 'done' ? 'line-through opacity-60' : ''">{{ subtask.title }}</span>
              </li>
            </ul>

            <div v-if="task.due_date" class="mt-2.5">
              <span
                class="type-meta inline-flex items-center gap-1 rounded-lg px-2 py-0.5 ring-1"
                :class="
                  isOverdue(task)
                    ? 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-200 dark:ring-rose-400/30'
                    : 'bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-500/15 dark:text-violet-200 dark:ring-violet-400/30'
                "
              >
                <svg class="h-3 w-3 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                {{ formatDate(task.due_date) }}
              </span>
            </div>

            <div class="mt-3 flex items-center justify-end gap-1.5">
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
                v-if="task.status !== 'done'"
                class="grid h-8 w-8 place-items-center rounded-lg border transition"
                :class="actionBtn.done"
                type="button"
                title="Mark done"
                aria-label="Mark task done"
                @click="emit('update-task', task.id, { status: 'done' })"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </button>
              <button
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
          </article>

          <p v-if="!column.tasks.length" class="type-empty neon-board-empty rounded-xl p-4 text-center">
            Drop tasks here
          </p>
        </div>
      </section>
    </div>
  </section>
</template>
