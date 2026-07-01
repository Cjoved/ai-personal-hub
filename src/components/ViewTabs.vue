<script setup>
const views = [
  { value: 'list', label: 'List' },
  { value: 'board', label: 'Board' },
  { value: 'calendar', label: 'Calendar' },
]

defineProps({
  modelValue: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="view-tabs-neon inline-flex rounded-xl border border-slate-200/90 bg-slate-100/80 p-1 dark:border-indigo-400/25">
    <button
      v-for="view in views"
      :key="view.value"
      class="type-tab rounded-lg px-3 py-2 transition focus:outline-none focus:ring-4 focus:ring-emerald-500/10 sm:px-4"
      :class="
        modelValue === view.value
          ? 'view-tab-active bg-white text-emerald-800 shadow-sm dark:bg-indigo-500/20 dark:text-indigo-200'
          : 'view-tab-idle text-slate-600 hover:text-slate-900 dark:text-indigo-300/70 dark:hover:text-indigo-200'
      "
      type="button"
      @click="emit('update:modelValue', view.value)"
    >
      {{ view.label }}
    </button>
  </div>
</template>
