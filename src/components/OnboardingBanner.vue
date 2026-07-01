<script setup>
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['complete'])

const steps = [
  'Use Spaces to group work areas, then Lists for projects.',
  'Press N for a new task or Ctrl+K to focus search.',
  'Switch between List, Board, and Calendar views per list.',
]
</script>

<template>
  <section
    v-if="visible"
    class="rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50 to-cyan-50 p-4 dark:border-emerald-400/30 dark:from-emerald-500/10 dark:to-cyan-500/10"
  >
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h3 class="type-card-title text-emerald-900 dark:text-emerald-200">Welcome to Tasker</h3>
        <ul class="type-body-sm mt-2 list-disc space-y-1 pl-5 text-emerald-800 dark:text-emerald-100/90">
          <li v-for="step in steps" :key="step">{{ step }}</li>
        </ul>
      </div>
      <button
        class="type-button shrink-0 rounded-xl bg-emerald-600 px-4 py-2 text-white transition hover:bg-emerald-500"
        type="button"
        @click="emit('complete')"
      >
        Got it
      </button>
    </div>
  </section>
</template>
