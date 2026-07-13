<script setup>
import { computed, nextTick, ref, watch } from 'vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  categories: {
    type: Array,
    default: () => [],
  },
  isSaving: {
    type: Boolean,
    default: false,
  },
  errorMessage: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['create', 'update', 'delete', 'close'])

const panelRef = ref(null)
const name = ref('')
const color = ref('#f59e0b')
const editingId = ref(null)

const palette = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16',
  '#10b981', '#06b6d4', '#3b82f6', '#6366f1',
  '#8b5cf6', '#ec4899', '#f43f5e', '#64748b',
]

const colorOptions = computed(() => {
  const current = (color.value || '').toLowerCase()
  if (current && !palette.some((option) => option.toLowerCase() === current)) {
    return [color.value, ...palette]
  }
  return palette
})

const isEditing = computed(() => Boolean(editingId.value))

function isSelected(option) {
  return (color.value || '').toLowerCase() === (option || '').toLowerCase()
}

function resetCreate() {
  name.value = ''
  color.value = '#f59e0b'
  editingId.value = null
}

function startEdit(category) {
  editingId.value = category.id
  name.value = category.name
  color.value = category.color || '#f59e0b'
  nextTick(() => panelRef.value?.querySelector('#habit-cat-name')?.focus())
}

function submit() {
  if (!name.value.trim() || props.isSaving) return
  if (editingId.value) {
    emit('update', editingId.value, { name: name.value.trim(), color: color.value })
  } else {
    emit('create', { name: name.value.trim(), color: color.value })
  }
  resetCreate()
}

function onKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
  }
}

watch(
  () => props.isOpen,
  async (open) => {
    if (open) {
      resetCreate()
      await nextTick()
      panelRef.value?.querySelector('input, button')?.focus()
      window.addEventListener('keydown', onKeydown)
    } else {
      window.removeEventListener('keydown', onKeydown)
    }
  },
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
      <div
        ref="panelRef"
        class="habit-modal-panel habit-modal-panel--sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="habit-cat-modal-title"
      >
        <div class="habit-modal-handle" aria-hidden="true"></div>

        <header class="habit-modal-header">
          <div class="min-w-0">
            <p class="habits-kicker">Organize</p>
            <h3 id="habit-cat-modal-title" class="habit-modal-title">Habit categories</h3>
            <p class="habit-modal-subtitle">
              Group habits by Health, Focus, Lifestyle, or your own labels.
            </p>
          </div>
          <button class="habit-modal-close" type="button" aria-label="Close" @click="emit('close')">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div class="habit-modal-body space-y-4">
          <p
            v-if="errorMessage"
            class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200"
            role="alert"
          >
            {{ errorMessage }}
          </p>

          <section class="habit-modal-section !p-0 overflow-hidden">
            <div class="border-b border-amber-200/40 px-3 py-2 dark:border-amber-400/15">
              <p class="text-xs font-bold uppercase tracking-wide text-slate-500">Your categories</p>
            </div>
            <ul v-if="categories.length" class="max-h-52 divide-y divide-amber-100/80 overflow-y-auto dark:divide-amber-400/10">
              <li
                v-for="category in categories"
                :key="category.id"
                class="flex items-center justify-between gap-2 px-3 py-2.5 transition"
                :class="editingId === category.id ? 'bg-amber-50/80 dark:bg-amber-500/10' : 'hover:bg-amber-50/40 dark:hover:bg-white/5'"
              >
                <span class="flex min-w-0 items-center gap-2.5">
                  <span
                    class="h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-white dark:ring-slate-900"
                    :style="{ background: category.color }"
                  ></span>
                  <span class="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{{ category.name }}</span>
                </span>
                <span class="flex gap-1">
                  <button
                    class="habits-action-btn"
                    type="button"
                    data-tooltip="Edit"
                    aria-label="Edit category"
                    @click="startEdit(category)"
                  >
                    <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>
                  <button
                    class="habits-action-btn habits-action-btn--danger"
                    type="button"
                    data-tooltip="Delete"
                    aria-label="Delete category"
                    @click="emit('delete', category.id)"
                  >
                    <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    </svg>
                  </button>
                </span>
              </li>
            </ul>
            <p v-else class="px-3 py-6 text-center text-sm text-slate-500">No categories yet — add one below.</p>
          </section>

          <form class="habit-modal-section space-y-3" @submit.prevent="submit">
            <div class="habit-modal-section__head !mb-0">
              <span class="habit-modal-step">{{ isEditing ? '✎' : '+' }}</span>
              <div>
                <h4 class="habit-modal-section__title">{{ isEditing ? 'Edit category' : 'New category' }}</h4>
                <p class="habit-modal-section__hint">{{ isEditing ? 'Update the name or color, then save.' : 'Add a label for grouping habits.' }}</p>
              </div>
            </div>

            <div>
              <label class="habit-modal-label" for="habit-cat-name">Name</label>
              <input id="habit-cat-name" v-model="name" class="habit-modal-input" required maxlength="40" placeholder="e.g. Health" />
            </div>

            <div>
              <p class="habit-modal-label">Color</p>
              <div class="flex flex-wrap gap-2.5" role="listbox" aria-label="Category color">
                <button
                  v-for="option in colorOptions"
                  :key="option"
                  class="habit-color-swatch"
                  :class="{ 'habit-color-swatch--active': isSelected(option) }"
                  type="button"
                  role="option"
                  :aria-selected="isSelected(option)"
                  :aria-label="`Color ${option}`"
                  :style="{ background: option }"
                  @click="color = option"
                />
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-1">
              <button
                v-if="isEditing"
                class="habit-modal-secondary"
                type="button"
                @click="resetCreate"
              >
                Cancel edit
              </button>
              <button class="habits-primary-btn disabled:opacity-50" type="submit" :disabled="isSaving || !name.trim()">
                <span v-if="isSaving" class="inline-flex items-center gap-2">
                  <span class="habit-modal-spinner" aria-hidden="true"></span>
                  Saving…
                </span>
                <span v-else>{{ isEditing ? 'Save' : 'Add category' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </Teleport>
</template>
