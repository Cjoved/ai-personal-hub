<script setup>
const views = [
  { value: 'list', label: 'List' },
  { value: 'board', label: 'Board' },
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
  <div class="flex flex-wrap gap-2">
    <button
      v-for="view in views"
      :key="view.value"
      class="rounded-xl border px-4 py-2 text-sm font-extrabold transition focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
      :class="
        modelValue === view.value
          ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
      "
      type="button"
      @click="emit('update:modelValue', view.value)"
    >
      {{ view.label }}
    </button>
  </div>
</template>
