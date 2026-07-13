<script setup>
import { ref, watch } from 'vue'

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

const name = ref('')
const kind = ref('expense')
const color = ref('#1e40af')
const monthlyLimit = ref('')
const editingId = ref(null)

function resetCreate() {
  name.value = ''
  kind.value = 'expense'
  color.value = '#1e40af'
  monthlyLimit.value = ''
  editingId.value = null
}

function startEdit(category) {
  editingId.value = category.id
  name.value = category.name
  kind.value = category.kind === 'income' ? 'income' : 'expense'
  color.value = category.color || '#1e40af'
  monthlyLimit.value = category.monthly_limit != null ? String(category.monthly_limit) : ''
}

function submit() {
  if (!name.value.trim() || props.isSaving) return
  const payload = {
    name: name.value.trim(),
    kind: kind.value,
    color: color.value,
    monthly_limit: monthlyLimit.value ? Number(monthlyLimit.value) : null,
  }
  if (editingId.value) emit('update', editingId.value, payload)
  else emit('create', payload)
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
  (open) => {
    if (open) {
      resetCreate()
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
      class="finance-modal-backdrop"
      role="presentation"
      @click.self="emit('close')"
    >
      <div
        class="finance-modal-panel finance-modal-panel--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="budget-cat-modal-title"
      >
        <div class="finance-modal-handle" aria-hidden="true"></div>

        <header class="finance-modal-header">
          <div class="min-w-0">
            <p class="finance-kicker">Organize</p>
            <h3 id="budget-cat-modal-title" class="finance-modal-title">Finance categories</h3>
            <p class="finance-modal-subtitle">
              Group income and expenses, and set optional monthly limits.
            </p>
          </div>
          <button class="finance-modal-close" type="button" aria-label="Close" @click="emit('close')">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div class="finance-modal-body space-y-4">
          <p
            v-if="errorMessage"
            class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
          >
            {{ errorMessage }}
          </p>

          <ul class="max-h-52 space-y-2 overflow-y-auto">
            <li v-for="category in categories" :key="category.id" class="finance-row !p-3">
              <div class="flex items-center justify-between gap-2">
                <span class="min-w-0">
                  <span class="flex items-center gap-2">
                    <span class="h-3 w-3 rounded-full" :style="{ background: category.color }"></span>
                    <strong class="truncate text-sm text-slate-900 dark:text-slate-100">{{ category.name }}</strong>
                  </span>
                  <span class="type-caption type-muted">
                    {{ category.kind }}
                    <template v-if="category.monthly_limit != null"> · limit {{ category.monthly_limit }}</template>
                  </span>
                </span>
                <span class="flex gap-1">
                  <button
                    class="finance-action-btn !h-9 !w-9 !min-h-0 !min-w-0"
                    type="button"
                    aria-label="Edit category"
                    title="Edit"
                    @click="startEdit(category)"
                  >
                    <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>
                  <button
                    class="finance-action-btn finance-action-btn--danger !h-9 !w-9 !min-h-0 !min-w-0"
                    type="button"
                    aria-label="Delete category"
                    title="Delete"
                    @click="emit('delete', category.id)"
                  >
                    <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6l-1 14H6L5 6" />
                    </svg>
                  </button>
                </span>
              </div>
            </li>
          </ul>

          <form class="space-y-4" @submit.prevent="submit">
            <div class="finance-toggle-group" role="group" aria-label="Category kind">
              <button
                class="finance-toggle finance-toggle--expense"
                :class="{ 'is-active': kind === 'expense' }"
                type="button"
                @click="kind = 'expense'"
              >
                Expense
              </button>
              <button
                class="finance-toggle finance-toggle--income"
                :class="{ 'is-active': kind === 'income' }"
                type="button"
                @click="kind = 'income'"
              >
                Income
              </button>
            </div>

            <div class="finance-form-grid finance-form-grid--2">
              <div class="finance-field">
                <label class="finance-label" for="budget-cat-name">Name</label>
                <input id="budget-cat-name" v-model="name" class="finance-input" required placeholder="e.g. Groceries" />
              </div>
              <div class="finance-field">
                <label class="finance-label" for="budget-cat-limit">Monthly limit</label>
                <input
                  id="budget-cat-limit"
                  v-model="monthlyLimit"
                  class="finance-input"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Optional"
                />
              </div>
              <div class="finance-field">
                <label class="finance-label" for="budget-cat-color">Color</label>
                <input id="budget-cat-color" v-model="color" class="finance-color-input" type="color" />
              </div>
            </div>
          </form>
        </div>

        <footer class="finance-modal-footer">
          <button v-if="editingId" class="finance-ghost-btn" type="button" @click="resetCreate">
            Cancel edit
          </button>
          <button class="finance-ghost-btn" type="button" @click="emit('close')">Close</button>
          <button
            class="finance-primary-btn disabled:opacity-50"
            type="button"
            :disabled="isSaving || !name.trim()"
            @click="submit"
          >
            {{ editingId ? 'Save category' : 'Add category' }}
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>
