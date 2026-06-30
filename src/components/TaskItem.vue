<script setup>
import { computed } from 'vue'
import { priorityOptions, statusOptions } from '../composables/useTasks'

const props = defineProps({
  task: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['update-task', 'archive-task', 'delete-task', 'edit-task'])

const priorityTone = computed(() => {
  const tones = {
    urgent: 'bg-rose-100 text-rose-700',
    high: 'bg-amber-100 text-amber-700',
    normal: 'bg-sky-100 text-sky-700',
    low: 'bg-slate-100 text-slate-600',
  }

  return tones[props.task.priority] || tones.normal
})

const formattedDueDate = computed(() => {
  if (!props.task.due_date) return 'No due date'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(props.task.due_date))
})

const locationLabel = computed(() => {
  if (props.task.space?.name && props.task.list?.name) return `${props.task.space.name} / ${props.task.list.name}`
  if (props.task.space?.name) return props.task.space.name
  return 'No location'
})

function updateField(field, value) {
  emit('update-task', props.task.id, { [field]: value })
}
</script>

<template>
  <article class="py-4">
    <div class="grid gap-4 xl:grid-cols-[1fr_360px] xl:items-center">
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide" :class="priorityTone">
            {{ task.priority }}
          </span>
          <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {{ task.status.replace('_', ' ') }}
          </span>
          <span class="text-xs text-slate-500">{{ formattedDueDate }}</span>
        </div>

        <h3 class="mt-3 truncate text-base font-extrabold text-slate-950">{{ task.title }}</h3>
        <p class="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">{{ locationLabel }}</p>
        <p v-if="task.description" class="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
          {{ task.description }}
        </p>
        <p v-if="task.category" class="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">
          {{ task.category }}
        </p>
      </div>

      <div class="grid gap-2 sm:grid-cols-2">
        <select
          class="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          :value="task.status"
          aria-label="Update status"
          @change="updateField('status', $event.target.value)"
        >
          <option v-for="option in statusOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>

        <select
          class="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          :value="task.priority"
          aria-label="Update priority"
          @change="updateField('priority', $event.target.value)"
        >
          <option v-for="option in priorityOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>

        <button
          class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
          type="button"
          @click="emit('edit-task', task)"
        >
          Edit
        </button>

        <div class="grid grid-cols-2 gap-2">
          <button
            class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-500/10"
            type="button"
            @click="emit('archive-task', task.id)"
          >
            Archive
          </button>
          <button
            class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-100 focus:outline-none focus:ring-4 focus:ring-rose-500/10"
            type="button"
            @click="emit('delete-task', task.id)"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </article>
</template>
