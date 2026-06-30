<script setup>
import { filterOptions } from '../composables/useTasks'

defineProps({
  modelValue: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div class="flex flex-wrap gap-2">
      <button
        v-for="option in filterOptions"
        :key="option.value"
        class="rounded-xl border px-4 py-2 text-sm font-extrabold transition focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
        :class="
          modelValue === option.value
            ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
        "
        type="button"
        @click="emit('update:modelValue', option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </section>
</template>
