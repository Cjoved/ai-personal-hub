<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  goal: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['save', 'close'])

const title = ref('')
const description = ref('')
const startsAt = ref('')
const endsAt = ref('')
const color = ref('#6366f1')

const colorOptions = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16',
  '#10b981', '#06b6d4', '#3b82f6', '#6366f1',
  '#8b5cf6', '#ec4899', '#f43f5e', '#64748b',
]

const isValid = computed(() => {
  if (!title.value.trim() || !endsAt.value) return false
  if (startsAt.value && endsAt.value) {
    return new Date(endsAt.value) > new Date(startsAt.value)
  }
  return true
})

function toDateInput(value) {
  if (!value) return ''
  const date = new Date(value)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

function resetForm() {
  if (props.goal) {
    title.value = props.goal.title || ''
    description.value = props.goal.description || ''
    startsAt.value = toDateInput(props.goal.starts_at)
    endsAt.value = toDateInput(props.goal.ends_at)
    color.value = props.goal.color || '#6366f1'
    return
  }

  title.value = ''
  description.value = ''
  startsAt.value = toDateInput(new Date())
  const defaultEnd = new Date()
  defaultEnd.setMonth(defaultEnd.getMonth() + 1)
  endsAt.value = toDateInput(defaultEnd)
  color.value = '#6366f1'
}

watch(() => props.isOpen, (open) => {
  if (open) resetForm()
}, { immediate: true })

watch(() => props.goal, () => {
  if (props.isOpen) resetForm()
})

function handleSave() {
  if (!isValid.value) return

  emit('save', {
    id: props.goal?.id,
    title: title.value.trim(),
    description: description.value.trim() || null,
    starts_at: startsAt.value ? new Date(startsAt.value).toISOString() : new Date().toISOString(),
    ends_at: new Date(endsAt.value).toISOString(),
    color: color.value,
  })
}

function handleBackdropClick(event) {
  if (event.target === event.currentTarget) {
    emit('close')
  }
}
</script>

<template>
  <div v-if="isOpen" class="goal-editor-overlay" @click="handleBackdropClick">
    <div
      class="goal-editor relative mx-4 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900"
      role="dialog"
      aria-modal="true"
    >
      <div class="mb-6 flex items-start justify-between">
        <div>
          <h2 class="type-section-title text-lg text-slate-900 dark:text-slate-100">
            {{ goal ? 'Edit Goal' : 'New Goal' }}
          </h2>
          <p class="type-body-sm type-muted mt-1">Set a motivational goal with a visible countdown on your dashboard.</p>
        </div>
        <button
          class="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          type="button"
          @click="$emit('close')"
        >
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form class="space-y-5" @submit.prevent="handleSave">
        <div>
          <label class="type-label type-muted mb-1.5 block">Goal</label>
          <input
            v-model.trim="title"
            class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            placeholder="e.g. Earn ₱50,000 before December 31"
            required
            autofocus
          />
        </div>

        <div>
          <label class="type-label type-muted mb-1.5 block">Why it matters</label>
          <textarea
            v-model.trim="description"
            class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            rows="2"
            placeholder="Optional motivation note..."
          />
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="type-label type-muted mb-1.5 block">Starts</label>
            <input
              v-model="startsAt"
              type="datetime-local"
              class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label class="type-label type-muted mb-1.5 block">Ends</label>
            <input
              v-model="endsAt"
              type="datetime-local"
              class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              required
            />
          </div>
        </div>

        <div>
          <label class="type-label type-muted mb-1.5 block">Accent color</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="c in colorOptions"
              :key="c"
              type="button"
              class="h-8 w-8 rounded-full transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2"
              :class="{ 'ring-2 ring-slate-400 ring-offset-2 dark:ring-slate-300': color === c }"
              :style="{ background: c }"
              @click="color = c"
            ></button>
          </div>
        </div>

        <p class="type-caption type-muted rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
          Active goals stay on your dashboard until the timeframe ends. You can only delete them after that.
        </p>

        <div class="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            class="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            @click="$emit('close')"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
            :disabled="!isValid"
          >
            {{ goal ? 'Update Goal' : 'Create Goal' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.goal-editor-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}
</style>
