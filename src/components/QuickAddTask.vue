<script setup>
import { ref } from 'vue'

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['add-task'])

const title = ref('')
const isSubmitting = ref(false)

async function handleSubmit() {
  const value = title.value.trim()
  if (!value || props.disabled || isSubmitting.value) return

  isSubmitting.value = true
  emit('add-task', { title: value, status: 'todo' })
  title.value = ''
  isSubmitting.value = false
}
</script>

<template>
  <form class="flex min-w-0 flex-1 items-center gap-2" @submit.prevent="handleSubmit">
    <input
      v-model.trim="title"
      class="type-input min-w-0 flex-1 rounded-xl border border-slate-200/90 bg-white/90 px-3 py-2 text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-100"
      placeholder="Quick add task…"
      :disabled="disabled"
      aria-label="Quick add task"
    />
    <button
      class="inline-flex h-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-3 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:from-emerald-500 hover:to-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
      type="submit"
      :disabled="disabled || !title.trim()"
    >
      Add
    </button>
  </form>
</template>
