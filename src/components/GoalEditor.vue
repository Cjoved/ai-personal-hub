<script setup>
import { computed, ref, watch } from 'vue'
import TaskDateTimeSelect from './TaskDateTimeSelect.vue'

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
const color = ref('#10b981')

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
    color.value = props.goal.color || '#10b981'
    return
  }

  title.value = ''
  description.value = ''
  startsAt.value = toDateInput(new Date())
  const defaultEnd = new Date()
  defaultEnd.setMonth(defaultEnd.getMonth() + 1)
  endsAt.value = toDateInput(defaultEnd)
  color.value = '#10b981'
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
  <Teleport to="body">
    <div v-if="isOpen" class="task-editor-backdrop fixed inset-0 z-[260] grid place-items-center px-0 py-0 sm:px-4 sm:py-6" @click="handleBackdropClick">
      <form
        class="task-editor-modal task-editor-modal--goal"
        role="dialog"
        aria-modal="true"
        @submit.prevent="handleSave"
        @click.stop
      >
        <div class="task-editor-handle" aria-hidden="true"></div>
        <div class="task-editor-accent"></div>

        <header class="task-editor-header">
          <div class="min-w-0">
            <p class="type-label text-emerald-600 dark:text-emerald-400">{{ goal ? 'Goal' : 'New goal' }}</p>
            <h2 class="type-section-title mt-1 text-slate-950 dark:text-slate-100">
              {{ goal ? 'Edit goal' : 'Create goal' }}
            </h2>
            <p class="task-editor-subtitle">Countdown stays on your dashboard until the timeframe ends.</p>
          </div>
          <button class="task-editor-close" type="button" aria-label="Close" @click="emit('close')">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div class="task-editor-body">
          <section class="task-editor-section">
            <div class="task-editor-field">
              <label class="task-editor-label" for="goal-title">Goal</label>
              <input
                id="goal-title"
                v-model.trim="title"
                class="task-editor-input"
                placeholder="e.g. Earn ₱50,000 before December 31"
                required
                autofocus
              />
            </div>
            <div class="task-editor-field">
              <label class="task-editor-label" for="goal-description">Why it matters</label>
              <textarea
                id="goal-description"
                v-model.trim="description"
                class="task-editor-input task-editor-textarea"
                placeholder="Optional motivation note..."
              />
            </div>
          </section>

          <section class="task-editor-section">
            <p class="task-editor-section-title">Timeframe</p>
            <div class="task-editor-grid sm:grid-cols-2">
              <div class="task-editor-field">
                <label class="task-editor-label">Starts</label>
                <TaskDateTimeSelect
                  v-model="startsAt"
                  aria-label="Goal start date and time"
                  placeholder="Start now"
                />
              </div>
              <div class="task-editor-field">
                <label class="task-editor-label">Ends</label>
                <TaskDateTimeSelect
                  v-model="endsAt"
                  aria-label="Goal end date and time"
                  placeholder="Pick end date"
                  :allow-clear="false"
                />
              </div>
            </div>
          </section>

          <section class="task-editor-section">
            <p class="task-editor-section-title">Accent color</p>
            <div class="task-editor-colors">
              <button
                v-for="c in colorOptions"
                :key="c"
                type="button"
                class="task-editor-color"
                :class="{ 'task-editor-color--active': color === c }"
                :style="{ background: c }"
                :aria-label="`Color ${c}`"
                @click="color = c"
              ></button>
            </div>
          </section>
        </div>

        <footer class="task-editor-footer">
          <button class="task-editor-btn task-editor-btn--ghost" type="button" @click="emit('close')">Cancel</button>
          <button class="task-editor-btn task-editor-btn--primary" type="submit" :disabled="!isValid">
            {{ goal ? 'Update goal' : 'Create goal' }}
          </button>
        </footer>
      </form>
    </div>
  </Teleport>
</template>
