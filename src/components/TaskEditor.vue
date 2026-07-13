<script setup>
import { computed, reactive, ref, watch } from 'vue'
import AppSelect from './AppSelect.vue'
import TaskDateTimeSelect from './TaskDateTimeSelect.vue'
import { priorityOptions, recurrenceOptions, statusOptions } from '../composables/useTasks'

const props = defineProps({
  task: {
    type: Object,
    required: true,
  },
  spaces: {
    type: Array,
    default: () => [],
  },
  lists: {
    type: Array,
    default: () => [],
  },
  createSubtask: {
    type: Function,
    default: null,
  },
  updateSubtask: {
    type: Function,
    default: null,
  },
  deleteSubtask: {
    type: Function,
    default: null,
  },
  reorderSubtasks: {
    type: Function,
    default: null,
  },
})

const emit = defineEmits(['save-task', 'create-task', 'close'])

const isCreate = computed(() => !props.task?.id)
const subtaskDraft = ref('')
const draggingSubtaskId = ref(null)

const form = reactive({
  title: '',
  description: '',
  status: 'todo',
  priority: 'normal',
  space_id: '',
  list_id: '',
  category: '',
  tags: '',
  due_date: '',
  reminder_at: '',
  estimated_minutes: '',
  recurrence_rule: 'none',
  recurrence_interval: 1,
})

const listsForSpace = computed(() => props.lists.filter((list) => list.space_id === form.space_id))
const subtasks = computed(() => props.task?.subtasks || [])

const spaceOptions = computed(() => [
  { value: '', label: 'No Space' },
  ...props.spaces.map((space) => ({ value: space.id, label: space.name })),
])

const listOptions = computed(() => [
  { value: '', label: 'No List' },
  ...listsForSpace.value.map((list) => ({ value: list.id, label: list.name })),
])

const statusTone = {
  inbox: 'border-indigo-200/80 bg-indigo-50 text-indigo-700',
  todo: 'border-slate-200/80 bg-slate-100 text-slate-700',
  in_progress: 'border-sky-200/80 bg-sky-50 text-sky-700',
  done: 'border-emerald-200/80 bg-emerald-50 text-emerald-700',
  archived: 'border-slate-200/80 bg-slate-100 text-slate-500',
}

const priorityTone = {
  urgent: 'border-rose-200/80 bg-rose-50 text-rose-700',
  high: 'border-orange-200/80 bg-orange-50 text-orange-700',
  normal: 'border-amber-200/80 bg-amber-50 text-amber-800',
  low: 'border-sky-200/80 bg-sky-50 text-sky-700',
}

function toDateInput(value) {
  if (!value) return ''
  const date = new Date(value)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

watch(
  () => props.task,
  (task) => {
    form.title = task.title ?? ''
    form.description = task.description ?? ''
    form.status = task.status ?? 'todo'
    form.priority = task.priority ?? 'normal'
    form.space_id = task.space_id ?? ''
    form.list_id = task.list_id ?? ''
    form.category = task.category ?? ''
    form.tags = (task.tags || []).join(', ')
    form.due_date = toDateInput(task.due_date)
    form.reminder_at = toDateInput(task.reminder_at)
    form.estimated_minutes = task.estimated_minutes ?? ''
    form.recurrence_rule = task.recurrence_rule || 'none'
    form.recurrence_interval = task.recurrence_interval || 1
  },
  { immediate: true },
)

function buildPayload() {
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    status: form.status,
    priority: form.priority,
    space_id: form.space_id || null,
    list_id: form.list_id || null,
    category: form.category.trim() || null,
    tags: form.tags,
    due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
    reminder_at: form.reminder_at ? new Date(form.reminder_at).toISOString() : null,
    estimated_minutes: form.estimated_minutes ? Number(form.estimated_minutes) : null,
    recurrence_rule: form.recurrence_rule || 'none',
    recurrence_interval: Number(form.recurrence_interval) || 1,
  }
}

function handleSubmit() {
  if (!form.title.trim()) return
  const payload = buildPayload()
  if (isCreate.value) {
    emit('create-task', { ...payload, status: 'todo' })
    return
  }
  emit('save-task', props.task.id, payload)
}

function handleSpaceChange() {
  const firstList = listsForSpace.value[0]
  form.list_id = firstList?.id ?? ''
}

function handleBackdropClick(event) {
  if (event.target === event.currentTarget) emit('close')
}

async function addSubtask() {
  if (!props.createSubtask || !props.task?.id || !subtaskDraft.value.trim()) return
  const didCreate = await props.createSubtask(props.task.id, subtaskDraft.value)
  if (didCreate) subtaskDraft.value = ''
}

async function toggleSubtask(subtask) {
  if (!props.updateSubtask) return
  await props.updateSubtask(subtask.id, { status: subtask.status === 'done' ? 'todo' : 'done' })
}

async function removeSubtask(subtaskId) {
  if (!props.deleteSubtask) return
  await props.deleteSubtask(subtaskId)
}

function onSubtaskDragStart(subtaskId) {
  draggingSubtaskId.value = subtaskId
}

async function onSubtaskDrop(targetId) {
  if (!props.reorderSubtasks || !props.task?.id || !draggingSubtaskId.value) return
  const ids = subtasks.value.map((item) => item.id)
  const from = ids.indexOf(draggingSubtaskId.value)
  const to = ids.indexOf(targetId)
  if (from < 0 || to < 0 || from === to) return
  ids.splice(from, 1)
  ids.splice(to, 0, draggingSubtaskId.value)
  draggingSubtaskId.value = null
  await props.reorderSubtasks(props.task.id, ids)
}
</script>

<template>
  <Teleport to="body">
    <div class="task-editor-backdrop fixed inset-0 z-[260] grid place-items-center px-0 py-0 sm:px-4 sm:py-6" @click="handleBackdropClick">
      <form class="task-editor-modal" role="dialog" aria-modal="true" @submit.prevent="handleSubmit" @click.stop>
        <div class="task-editor-handle" aria-hidden="true"></div>
        <div class="task-editor-accent"></div>

        <header class="task-editor-header">
          <div class="min-w-0">
            <p class="type-label text-emerald-600 dark:text-emerald-400">{{ isCreate ? 'New task' : 'Task details' }}</p>
            <h2 class="type-section-title mt-1 text-slate-950 dark:text-slate-100">
              {{ isCreate ? 'Add task' : 'Edit task' }}
            </h2>
          </div>
          <button class="task-editor-close" type="button" aria-label="Close" @click="emit('close')">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div class="task-editor-body task-editor-body--split">
          <div class="task-editor-col">
            <section class="task-editor-section">
              <div class="task-editor-field">
                <label class="task-editor-label" for="edit-title">Title</label>
                <input id="edit-title" v-model.trim="form.title" class="task-editor-input" placeholder="What needs to be done?" required autofocus />
              </div>
              <div class="task-editor-field">
                <label class="task-editor-label" for="edit-description">Description</label>
                <textarea id="edit-description" v-model="form.description" class="task-editor-input task-editor-textarea" placeholder="Optional context"></textarea>
              </div>
            </section>

            <section class="task-editor-section">
              <p class="task-editor-section-title">Details</p>
              <div class="task-editor-grid" :class="isCreate ? 'sm:grid-cols-1' : 'sm:grid-cols-2'">
                <div v-if="!isCreate" class="task-editor-field">
                  <label class="task-editor-label">Status</label>
                  <AppSelect v-model="form.status" :options="statusOptions" :option-tone="(value) => statusTone[value]" size="sm" block />
                </div>
                <div class="task-editor-field">
                  <label class="task-editor-label">Priority</label>
                  <AppSelect v-model="form.priority" :options="priorityOptions" :option-tone="(value) => priorityTone[value]" size="sm" block />
                </div>
              </div>
              <div class="task-editor-grid sm:grid-cols-2">
                <div class="task-editor-field">
                  <label class="task-editor-label">Space</label>
                  <AppSelect v-model="form.space_id" :options="spaceOptions" size="sm" block @change="handleSpaceChange" />
                </div>
                <div class="task-editor-field">
                  <label class="task-editor-label">List</label>
                  <AppSelect v-model="form.list_id" :options="listOptions" size="sm" block />
                </div>
              </div>
              <div class="task-editor-grid sm:grid-cols-2">
                <div class="task-editor-field">
                  <label class="task-editor-label" for="edit-tags">Tags</label>
                  <input id="edit-tags" v-model="form.tags" class="task-editor-input" placeholder="work, urgent" />
                </div>
                <div class="task-editor-field">
                  <label class="task-editor-label" for="edit-category">Category</label>
                  <input id="edit-category" v-model.trim="form.category" class="task-editor-input" placeholder="Optional" />
                </div>
              </div>
            </section>
          </div>

          <div class="task-editor-col">
            <section class="task-editor-section">
              <p class="task-editor-section-title">Schedule</p>
              <div class="task-editor-field">
                <label class="task-editor-label" for="edit-due">Due date</label>
                <TaskDateTimeSelect
                  id="edit-due"
                  v-model="form.due_date"
                  aria-label="Due date and time"
                  placeholder="No due date"
                />
              </div>
              <div class="task-editor-field">
                <label class="task-editor-label" for="edit-reminder">Reminder</label>
                <TaskDateTimeSelect
                  id="edit-reminder"
                  v-model="form.reminder_at"
                  aria-label="Reminder date and time"
                  placeholder="No reminder"
                />
              </div>
              <div class="task-editor-field">
                <label class="task-editor-label" for="edit-estimate">Estimate (min)</label>
                <input id="edit-estimate" v-model="form.estimated_minutes" class="task-editor-input" type="number" min="0" placeholder="0" />
              </div>
              <div class="task-editor-grid" :class="form.recurrence_rule !== 'none' ? 'sm:grid-cols-2' : 'sm:grid-cols-1'">
                <div class="task-editor-field">
                  <label class="task-editor-label">Recurrence</label>
                  <AppSelect v-model="form.recurrence_rule" :options="recurrenceOptions" size="sm" block />
                </div>
                <div v-if="form.recurrence_rule !== 'none'" class="task-editor-field">
                  <label class="task-editor-label" for="edit-interval">Repeat every</label>
                  <input id="edit-interval" v-model.number="form.recurrence_interval" class="task-editor-input" type="number" min="1" max="365" />
                </div>
              </div>
            </section>

            <section v-if="!isCreate && createSubtask" class="task-editor-section task-editor-subtasks">
              <p class="task-editor-section-title">Subtasks</p>
              <ul v-if="subtasks.length" class="space-y-1.5">
                <li
                  v-for="subtask in subtasks"
                  :key="subtask.id"
                  class="task-editor-subtask-row"
                  draggable="true"
                  @dragstart="onSubtaskDragStart(subtask.id)"
                  @dragover.prevent
                  @drop="onSubtaskDrop(subtask.id)"
                >
                  <input type="checkbox" :checked="subtask.status === 'done'" @change="toggleSubtask(subtask)" />
                  <span class="type-body-sm min-w-0 flex-1 truncate" :class="subtask.status === 'done' ? 'line-through text-slate-400' : ''">{{ subtask.title }}</span>
                  <button class="task-editor-subtask-remove" type="button" @click="removeSubtask(subtask.id)">Remove</button>
                </li>
              </ul>
              <form class="mt-2 flex gap-2" @submit.prevent="addSubtask">
                <input v-model.trim="subtaskDraft" class="task-editor-input min-w-0 flex-1" placeholder="Add subtask…" />
                <button class="task-editor-btn task-editor-btn--primary shrink-0" type="submit">Add</button>
              </form>
            </section>
          </div>
        </div>

        <footer class="task-editor-footer">
          <button class="task-editor-btn task-editor-btn--ghost" type="button" @click="emit('close')">Cancel</button>
          <button class="task-editor-btn task-editor-btn--primary" type="submit">
            {{ isCreate ? 'Add task' : 'Save changes' }}
          </button>
        </footer>
      </form>
    </div>
  </Teleport>
</template>
