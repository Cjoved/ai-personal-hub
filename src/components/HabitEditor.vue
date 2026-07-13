<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { WEEKDAY_LABELS } from '../composables/useHabits'
import HabitSelect from './HabitSelect.vue'
import HabitTimeSelect from './HabitTimeSelect.vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  habit: {
    type: Object,
    default: null,
  },
  categories: {
    type: Array,
    default: () => [],
  },
  habits: {
    type: Array,
    default: () => [],
  },
  isSaving: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['save', 'close'])

const panelRef = ref(null)
const title = ref('')
const notes = ref('')
const color = ref('#f59e0b')
const categoryId = ref('')
const habitType = ref('boolean')
const targetValue = ref(8)
const unit = ref('')
const frequency = ref('daily')
const targetDays = ref([])
const timesPerWeek = ref(3)
const intervalDays = ref(2)
const reminderTime = ref('')
const stackAfterId = ref('')
const xpReward = ref(10)

const typeOptions = [
  { id: 'boolean', label: 'Yes / No', hint: 'One tap done' },
  { id: 'quantity', label: 'Quantity', hint: 'Count toward a goal' },
  { id: 'duration', label: 'Duration', hint: 'Minutes or time spent' },
]

const frequencyOptions = [
  { id: 'daily', label: 'Daily' },
  { id: 'custom_days', label: 'Custom days' },
  { id: 'times_per_week', label: 'X× / week' },
  { id: 'every_n_days', label: 'Every N days' },
]

const colorOptions = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16',
  '#10b981', '#06b6d4', '#3b82f6', '#6366f1',
  '#8b5cf6', '#ec4899', '#f43f5e', '#64748b',
]

const stackOptions = computed(() => {
  const list = Array.isArray(props.habits) ? props.habits : []
  return list.filter((item) => item?.id && item.id !== props.habit?.id && !item.is_archived)
})

const categorySelectOptions = computed(() => [
  { value: '', label: 'Uncategorized' },
  ...(Array.isArray(props.categories) ? props.categories : []).map((category) => ({
    value: category.id,
    label: category.name,
  })),
])

const stackSelectOptions = computed(() => [
  { value: '', label: 'No stack' },
  ...stackOptions.value.map((item) => ({
    value: item.id,
    label: item.title,
  })),
])

const needsDays = computed(() => frequency.value === 'weekly' || frequency.value === 'custom_days')
const needsQuantity = computed(() => habitType.value === 'quantity' || habitType.value === 'duration')
const isEditing = computed(() => Boolean(props.habit?.id))

const isValid = computed(() => {
  if (!title.value.trim()) return false
  if (needsDays.value && !targetDays.value.length) return false
  if (frequency.value === 'times_per_week' && !(timesPerWeek.value >= 1 && timesPerWeek.value <= 7)) return false
  if (frequency.value === 'every_n_days' && !(intervalDays.value >= 1)) return false
  if (needsQuantity.value && !(Number(targetValue.value) > 0)) return false
  return true
})

function resetForm() {
  if (props.habit) {
    title.value = props.habit.title || ''
    notes.value = props.habit.notes || ''
    color.value = props.habit.color || '#f59e0b'
    categoryId.value = props.habit.category_id || ''
    habitType.value = props.habit.habit_type || 'boolean'
    targetValue.value = props.habit.target_value != null ? Number(props.habit.target_value) : habitType.value === 'duration' ? 30 : 8
    unit.value = props.habit.unit || (habitType.value === 'duration' ? 'mins' : '')
    frequency.value = props.habit.frequency || 'daily'
    targetDays.value = Array.isArray(props.habit.target_days) ? [...props.habit.target_days] : []
    timesPerWeek.value = props.habit.times_per_week || 3
    intervalDays.value = props.habit.interval_days || 2
    reminderTime.value = props.habit.reminder_time ? String(props.habit.reminder_time).slice(0, 5) : ''
    stackAfterId.value = props.habit.stack_after_habit_id || ''
    xpReward.value = props.habit.xp_reward ?? 10
  } else {
    title.value = ''
    notes.value = ''
    color.value = '#f59e0b'
    categoryId.value = ''
    habitType.value = 'boolean'
    targetValue.value = 8
    unit.value = ''
    frequency.value = 'daily'
    targetDays.value = []
    timesPerWeek.value = 3
    intervalDays.value = 2
    reminderTime.value = ''
    stackAfterId.value = ''
    xpReward.value = 10
  }
}

function setHabitType(type) {
  habitType.value = type
  if (type === 'duration' && !unit.value) unit.value = 'mins'
  if (type === 'quantity' && !targetValue.value) targetValue.value = 8
  if (type === 'duration' && (!targetValue.value || targetValue.value === 8)) targetValue.value = 30
}

function setFrequency(next) {
  frequency.value = next
  if ((next === 'weekly' || next === 'custom_days') && !targetDays.value.length) {
    targetDays.value = [1, 2, 3, 4, 5]
  }
}

function toggleDay(day) {
  if (targetDays.value.includes(day)) {
    targetDays.value = targetDays.value.filter((item) => item !== day)
  } else {
    targetDays.value = [...targetDays.value, day].sort((a, b) => a - b)
  }
}

function submit() {
  if (!isValid.value || props.isSaving) return
  emit('save', {
    title: title.value.trim(),
    notes: notes.value.trim(),
    color: color.value,
    category_id: categoryId.value || null,
    habit_type: habitType.value,
    target_value: needsQuantity.value ? Number(targetValue.value) : null,
    unit: needsQuantity.value ? (unit.value.trim() || (habitType.value === 'duration' ? 'mins' : 'units')) : null,
    frequency: frequency.value,
    target_days: needsDays.value ? targetDays.value : null,
    times_per_week: frequency.value === 'times_per_week' ? Number(timesPerWeek.value) : null,
    interval_days: frequency.value === 'every_n_days' ? Number(intervalDays.value) : null,
    reminder_time: reminderTime.value || null,
    stack_after_habit_id: stackAfterId.value || null,
    xp_reward: Number(xpReward.value) || 10,
  })
}

function onKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
  }
}

watch(
  () => [props.isOpen, props.habit],
  async ([open]) => {
    if (open) {
      resetForm()
      await nextTick()
      panelRef.value?.querySelector('input, button, select, textarea')?.focus()
      window.addEventListener('keydown', onKeydown)
    } else {
      window.removeEventListener('keydown', onKeydown)
    }
  },
  { immediate: true },
)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="habit-modal-backdrop"
      role="presentation"
      @click.self="emit('close')"
    >
      <form
        ref="panelRef"
        class="habit-modal-panel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="'habit-modal-title'"
        @submit.prevent="submit"
      >
        <div class="habit-modal-handle" aria-hidden="true"></div>

        <header class="habit-modal-header">
          <div class="min-w-0">
            <p class="habits-kicker">{{ isEditing ? 'Refine' : 'Build' }}</p>
            <h3 id="habit-modal-title" class="habit-modal-title">
              {{ isEditing ? 'Edit habit' : 'New habit' }}
            </h3>
            <p class="habit-modal-subtitle">
              Set how you track it, when it shows up, and what comes after.
            </p>
          </div>
          <button
            class="habit-modal-close"
            type="button"
            aria-label="Close"
            @click="emit('close')"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div class="habit-modal-body habit-modal-body--split">
          <div class="habit-modal-col">
            <section class="habit-modal-section">
              <div class="habit-modal-section__head">
                <span class="habit-modal-step">1</span>
                <div>
                  <h4 class="habit-modal-section__title">Basics</h4>
                  <p class="habit-modal-section__hint">Name it so you’ll recognize it at a glance.</p>
                </div>
              </div>

              <div class="space-y-3">
                <div>
                  <label class="habit-modal-label" for="habit-title">Title</label>
                  <input
                    id="habit-title"
                    v-model="title"
                    class="habit-modal-input"
                    required
                    maxlength="80"
                    placeholder="e.g. Morning stretch"
                    autocomplete="off"
                  />
                </div>
                <div>
                  <label class="habit-modal-label" for="habit-notes">Notes <span class="font-normal text-slate-400">(optional)</span></label>
                  <textarea
                    id="habit-notes"
                    v-model="notes"
                    class="habit-modal-textarea"
                    rows="2"
                    placeholder="Cue, context, or why this matters"
                  />
                </div>
                <div>
                  <p class="habit-modal-label">Color</p>
                  <div class="flex flex-wrap gap-2" role="listbox" aria-label="Habit color">
                    <button
                      v-for="option in colorOptions"
                      :key="option"
                      class="habit-color-swatch"
                      :class="{ 'habit-color-swatch--active': color === option }"
                      type="button"
                      role="option"
                      :aria-selected="color === option"
                      :aria-label="`Color ${option}`"
                      :style="{ background: option }"
                      @click="color = option"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section class="habit-modal-section">
              <div class="habit-modal-section__head">
                <span class="habit-modal-step">2</span>
                <div>
                  <h4 class="habit-modal-section__title">How you track</h4>
                  <p class="habit-modal-section__hint">Pick the check-in style that matches the habit.</p>
                </div>
              </div>

              <div class="habit-segment-grid" role="radiogroup" aria-label="Habit type">
                <button
                  v-for="option in typeOptions"
                  :key="option.id"
                  class="habit-segment-card"
                  :class="{ 'habit-segment-card--active': habitType === option.id }"
                  type="button"
                  role="radio"
                  :aria-checked="habitType === option.id"
                  @click="setHabitType(option.id)"
                >
                  <strong>{{ option.label }}</strong>
                  <span>{{ option.hint }}</span>
                </button>
              </div>

              <div v-if="needsQuantity" class="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label class="habit-modal-label" for="habit-target">Target</label>
                  <input id="habit-target" v-model.number="targetValue" class="habit-modal-input" type="number" min="1" step="1" />
                </div>
                <div>
                  <label class="habit-modal-label" for="habit-unit">Unit</label>
                  <input
                    id="habit-unit"
                    v-model="unit"
                    class="habit-modal-input"
                    :placeholder="habitType === 'duration' ? 'mins' : 'glasses'"
                  />
                </div>
              </div>
            </section>
          </div>

          <div class="habit-modal-col">
            <section class="habit-modal-section">
              <div class="habit-modal-section__head">
                <span class="habit-modal-step">3</span>
                <div>
                  <h4 class="habit-modal-section__title">Schedule</h4>
                  <p class="habit-modal-section__hint">When this habit should appear on Today.</p>
                </div>
              </div>

              <div class="habit-chip-row" role="radiogroup" aria-label="Frequency">
                <button
                  v-for="option in frequencyOptions"
                  :key="option.id"
                  class="habit-chip-btn"
                  :class="{
                    'habit-chip-btn--active':
                      frequency === option.id || (option.id === 'custom_days' && frequency === 'weekly'),
                  }"
                  type="button"
                  role="radio"
                  :aria-checked="frequency === option.id || (option.id === 'custom_days' && frequency === 'weekly')"
                  @click="setFrequency(option.id === 'custom_days' ? 'custom_days' : option.id)"
                >
                  {{ option.label }}
                </button>
              </div>

              <div v-if="needsDays" class="mt-3">
                <p class="habit-modal-label">Target days</p>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="(label, day) in WEEKDAY_LABELS"
                    :key="day"
                    class="habit-day-btn"
                    :class="{ 'habit-day-btn--active': targetDays.includes(day) }"
                    type="button"
                    :aria-pressed="targetDays.includes(day)"
                    @click="toggleDay(day)"
                  >
                    {{ label.slice(0, 1) }}
                  </button>
                </div>
              </div>

              <div v-if="frequency === 'times_per_week'" class="mt-3">
                <label class="habit-modal-label" for="habit-tpw">Times per week</label>
                <input id="habit-tpw" v-model.number="timesPerWeek" class="habit-modal-input" type="number" min="1" max="7" />
              </div>

              <div v-if="frequency === 'every_n_days'" class="mt-3">
                <label class="habit-modal-label" for="habit-interval">Every N days</label>
                <input id="habit-interval" v-model.number="intervalDays" class="habit-modal-input" type="number" min="1" max="60" />
              </div>

              <div class="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label class="habit-modal-label" for="habit-category">Category</label>
                  <HabitSelect
                    id="habit-category"
                    v-model="categoryId"
                    :options="categorySelectOptions"
                    aria-label="Category"
                    placeholder="Uncategorized"
                  />
                </div>
                <div>
                  <label class="habit-modal-label" for="habit-reminder">Reminder</label>
                  <HabitTimeSelect
                    id="habit-reminder"
                    v-model="reminderTime"
                    aria-label="Reminder time"
                  />
                </div>
              </div>
            </section>

            <section class="habit-modal-section">
              <div class="habit-modal-section__head">
                <span class="habit-modal-step">4</span>
                <div>
                  <h4 class="habit-modal-section__title">Stack & reward</h4>
                  <p class="habit-modal-section__hint">Optional links and light XP.</p>
                </div>
              </div>

              <div class="space-y-3">
                <div>
                  <label class="habit-modal-label" for="habit-stack">After I finish…</label>
                  <HabitSelect
                    id="habit-stack"
                    v-model="stackAfterId"
                    :options="stackSelectOptions"
                    aria-label="Habit stack"
                    placeholder="No stack"
                  />
                  <p class="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    Unlocks on Today after the parent is checked in.
                  </p>
                </div>
                <div>
                  <label class="habit-modal-label" for="habit-xp">XP reward</label>
                  <input id="habit-xp" v-model.number="xpReward" class="habit-modal-input" type="number" min="1" max="100" />
                </div>
              </div>
            </section>
          </div>
        </div>

        <footer class="habit-modal-footer">
          <button class="habit-modal-secondary" type="button" @click="emit('close')">Cancel</button>
          <button class="habits-primary-btn min-w-[8.5rem] disabled:opacity-50" type="submit" :disabled="!isValid || isSaving">
            <span v-if="isSaving" class="inline-flex items-center gap-2">
              <span class="habit-modal-spinner" aria-hidden="true"></span>
              Saving…
            </span>
            <span v-else>{{ isEditing ? 'Save changes' : 'Create habit' }}</span>
          </button>
        </footer>
      </form>
    </div>
  </Teleport>
</template>
