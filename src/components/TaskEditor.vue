<script setup>
import { computed, reactive, watch } from 'vue'
import { priorityOptions, statusOptions } from '../composables/useTasks'

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
})

const emit = defineEmits(['save-task', 'close'])

const form = reactive({
  title: '',
  description: '',
  status: 'inbox',
  priority: 'normal',
  space_id: '',
  list_id: '',
  category: '',
  due_date: '',
  estimated_minutes: '',
})

const listsForSpace = computed(() => props.lists.filter((list) => list.space_id === form.space_id))

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
    form.status = task.status ?? 'inbox'
    form.priority = task.priority ?? 'normal'
    form.space_id = task.space_id ?? ''
    form.list_id = task.list_id ?? ''
    form.category = task.category ?? ''
    form.due_date = toDateInput(task.due_date)
    form.estimated_minutes = task.estimated_minutes ?? ''
  },
  { immediate: true },
)

function handleSubmit() {
  if (!form.title.trim()) return

  emit('save-task', props.task.id, {
    title: form.title.trim(),
    description: form.description.trim() || null,
    status: form.status,
    priority: form.priority,
    space_id: form.space_id || null,
    list_id: form.list_id || null,
    category: form.category.trim() || null,
    due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
    estimated_minutes: form.estimated_minutes ? Number(form.estimated_minutes) : null,
  })
}

function handleSpaceChange() {
  const firstList = listsForSpace.value[0]
  form.list_id = firstList?.id ?? ''
}
</script>

<template>
  <div class="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm">
    <form
      class="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/20"
      @submit.prevent="handleSubmit"
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm font-extrabold uppercase tracking-[0.18em] text-emerald-600">Task details</p>
          <h2 class="mt-2 text-2xl font-black text-slate-950">Edit task</h2>
        </div>
        <button
          class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-bold text-slate-600 transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-slate-500/10"
          type="button"
          @click="emit('close')"
        >
          Close
        </button>
      </div>

      <div class="mt-6 grid gap-4">
        <div>
          <label class="text-sm font-bold text-slate-700" for="edit-title">Title</label>
          <input
            id="edit-title"
            v-model.trim="form.title"
            class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            required
          />
        </div>

        <div>
          <label class="text-sm font-bold text-slate-700" for="edit-description">Description</label>
          <textarea
            id="edit-description"
            v-model="form.description"
            class="mt-2 min-h-28 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            placeholder="Add extra context"
          ></textarea>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="text-sm font-bold text-slate-700" for="edit-status">Status</label>
            <select
              id="edit-status"
              v-model="form.status"
              class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            >
              <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>

          <div>
            <label class="text-sm font-bold text-slate-700" for="edit-priority">Priority</label>
            <select
              id="edit-priority"
              v-model="form.priority"
              class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            >
              <option v-for="option in priorityOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="text-sm font-bold text-slate-700" for="edit-space">Space</label>
            <select
              id="edit-space"
              v-model="form.space_id"
              class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              @change="handleSpaceChange"
            >
              <option value="">No Space</option>
              <option v-for="space in spaces" :key="space.id" :value="space.id">
                {{ space.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="text-sm font-bold text-slate-700" for="edit-list">List</label>
            <select
              id="edit-list"
              v-model="form.list_id"
              class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            >
              <option value="">No List</option>
              <option v-for="list in listsForSpace" :key="list.id" :value="list.id">
                {{ list.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-3">
          <div>
            <label class="text-sm font-bold text-slate-700" for="edit-category">Category</label>
            <input
              id="edit-category"
              v-model.trim="form.category"
              class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              placeholder="Personal"
            />
          </div>

          <div>
            <label class="text-sm font-bold text-slate-700" for="edit-due">Due date</label>
            <input
              id="edit-due"
              v-model="form.due_date"
              class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              type="datetime-local"
            />
          </div>

          <div>
            <label class="text-sm font-bold text-slate-700" for="edit-estimate">Estimate</label>
            <input
              id="edit-estimate"
              v-model="form.estimated_minutes"
              class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              type="number"
              min="0"
              placeholder="Minutes"
            />
          </div>
        </div>
      </div>

      <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          class="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-500/10"
          type="button"
          @click="emit('close')"
        >
          Cancel
        </button>
        <button
          class="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
          type="submit"
        >
          Save changes
        </button>
      </div>
    </form>
  </div>
</template>
