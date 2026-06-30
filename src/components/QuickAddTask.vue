<script setup>
import { ref } from 'vue'
import { priorityOptions } from '../composables/useTasks'

const props = defineProps({
  createTask: {
    type: Function,
    required: true,
  },
  locationLabel: {
    type: String,
    default: 'Dashboard',
  },
})

const title = ref('')
const dueDate = ref('')
const priority = ref('normal')
const isSubmitting = ref(false)

async function handleSubmit() {
  if (!title.value.trim() || isSubmitting.value) return

  isSubmitting.value = true
  const didCreate = await props.createTask({
    title: title.value,
    due_date: dueDate.value || null,
    priority: priority.value,
    status: 'inbox',
  })

  if (didCreate) {
    title.value = ''
    dueDate.value = ''
    priority.value = 'normal'
  }

  isSubmitting.value = false
}
</script>

<template>
  <form
    class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    @submit.prevent="handleSubmit"
  >
    <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <label class="text-sm font-extrabold text-slate-800" for="quick-task">Quick add</label>
      <span class="text-xs font-bold uppercase tracking-wide text-slate-500">{{ locationLabel }}</span>
    </div>
    <div class="mt-3 grid gap-3 lg:grid-cols-[1fr_180px_160px_auto]">
      <input
        id="quick-task"
        v-model.trim="title"
        class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
        placeholder="Capture a task before it slips away"
        required
      />

      <input
        v-model="dueDate"
        class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
        type="datetime-local"
        aria-label="Due date"
      />

      <select
        v-model="priority"
        class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
        aria-label="Priority"
      >
        <option v-for="option in priorityOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>

      <button
        class="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        type="submit"
        :disabled="isSubmitting || !title.trim()"
      >
        Add
      </button>
    </div>
  </form>
</template>
