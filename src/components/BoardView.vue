<script setup>
defineProps({
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

const emit = defineEmits(['update-task', 'archive-task', 'delete-task', 'edit-task'])

function formatLocation(task) {
  if (task.space?.name && task.list?.name) return `${task.space.name} / ${task.list.name}`
  if (task.space?.name) return task.space.name
  return 'No location'
}
</script>

<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <p v-if="errorMessage" class="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
      {{ errorMessage }}
    </p>

    <div v-if="isLoading" class="grid gap-4 xl:grid-cols-4">
      <div v-for="index in 4" :key="index" class="h-80 animate-pulse rounded-2xl bg-slate-100"></div>
    </div>

    <div v-else class="grid gap-4 xl:grid-cols-4">
      <section
        v-for="column in columns"
        :key="column.value"
        class="min-h-80 rounded-2xl border border-slate-200 bg-slate-50 p-3"
      >
        <div class="mb-3 flex items-center justify-between px-1">
          <h3 class="text-sm font-extrabold text-slate-800">{{ column.label }}</h3>
          <span class="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-500">{{ column.tasks.length }}</span>
        </div>

        <div class="space-y-3">
          <article
            v-for="task in column.tasks"
            :key="task.id"
            class="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h4 class="truncate text-sm font-extrabold text-slate-950">{{ task.title }}</h4>
                <p class="mt-1 truncate text-xs text-slate-500">{{ formatLocation(task) }}</p>
              </div>
              <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-slate-600">
                {{ task.priority }}
              </span>
            </div>

            <p v-if="task.description" class="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
              {{ task.description }}
            </p>

            <div class="mt-3 grid grid-cols-2 gap-2">
              <button
                class="rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                type="button"
                @click="emit('edit-task', task)"
              >
                Edit
              </button>
              <button
                class="rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                type="button"
                @click="emit('update-task', task.id, { status: 'done' })"
              >
                Done
              </button>
              <button
                class="rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-slate-50"
                type="button"
                @click="emit('archive-task', task.id)"
              >
                Archive
              </button>
              <button
                class="rounded-xl border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                type="button"
                @click="emit('delete-task', task.id)"
              >
                Delete
              </button>
            </div>
          </article>

          <p v-if="!column.tasks.length" class="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
            No tasks
          </p>
        </div>
      </section>
    </div>
  </section>
</template>
