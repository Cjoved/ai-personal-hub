<script setup>
import { ref, watch } from 'vue'
import FinanceCategoryIcon from './FinanceCategoryIcon.vue'
import FinanceMoneyInput from './FinanceMoneyInput.vue'
import { FINANCE_CATEGORY_ICONS, normalizeCategoryIcon } from '../lib/financeCategoryIcons'
import { formatMoney } from '../composables/useFinance'

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
const icon = ref('other')
const monthlyLimit = ref('')
const editingId = ref(null)

const iconOptions = FINANCE_CATEGORY_ICONS

function resetCreate() {
  name.value = ''
  kind.value = 'expense'
  color.value = '#1e40af'
  icon.value = 'other'
  monthlyLimit.value = ''
  editingId.value = null
}

function startEdit(category) {
  editingId.value = category.id
  name.value = category.name
  kind.value = category.kind === 'income' ? 'income' : 'expense'
  color.value = category.color || '#1e40af'
  icon.value = normalizeCategoryIcon(category.icon)
  monthlyLimit.value = category.monthly_limit != null ? String(category.monthly_limit) : ''
}

function submit() {
  if (!name.value.trim() || props.isSaving) return
  const payload = {
    name: name.value.trim(),
    kind: kind.value,
    color: color.value,
    icon: normalizeCategoryIcon(icon.value),
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
        class="finance-modal-panel finance-modal-panel--landscape"
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

        <p
          v-if="errorMessage"
          class="mx-5 mb-0 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200 sm:mx-6"
        >
          {{ errorMessage }}
        </p>

        <div class="finance-cat-layout">
          <!-- Column 1: category list -->
          <section class="finance-cat-layout__list" aria-label="Existing categories">
            <div class="finance-cat-layout__list-head">
              <h4 class="finance-cat-layout__list-title">Your categories</h4>
              <span class="finance-cat-layout__count">{{ categories.length }}</span>
            </div>

            <div v-if="!categories.length" class="finance-cat-layout__empty">
              <p class="font-semibold">No categories yet</p>
              <p class="type-caption type-muted mt-1">Use the form on the right to add your first one.</p>
            </div>

            <ul v-else class="finance-cat-layout__items">
              <li
                v-for="category in categories"
                :key="category.id"
                class="finance-cat-layout__item"
                :class="{ 'is-editing': editingId === category.id }"
              >
                <span
                  class="finance-cat-badge"
                  :style="{ '--cat-accent': category.color || '#1e40af' }"
                  aria-hidden="true"
                >
                  <FinanceCategoryIcon :icon="category.icon" />
                </span>
                <span class="finance-cat-layout__item-copy min-w-0">
                  <strong class="truncate">{{ category.name }}</strong>
                  <span class="type-caption type-muted">
                    {{ category.kind }}
                    <template v-if="category.monthly_limit != null">
                      · limit {{ formatMoney(category.monthly_limit) }}
                    </template>
                  </span>
                </span>
                <span class="finance-cat-layout__item-actions">
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
              </li>
            </ul>
          </section>

          <!-- Column 2: create / edit form -->
          <form class="finance-cat-layout__form" @submit.prevent="submit">
            <div class="finance-modal-section__head !mb-0">
              <span class="finance-modal-step">{{ editingId ? '✎' : '+' }}</span>
              <div>
                <h4 class="finance-modal-section__title">
                  {{ editingId ? 'Edit category' : 'New category' }}
                </h4>
                <p class="finance-modal-section__hint">
                  {{ editingId ? 'Update the name, icon, or limit, then save.' : 'Pick a color and icon for this category.' }}
                </p>
              </div>
            </div>

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
                <input
                  id="budget-cat-name"
                  v-model="name"
                  class="finance-input"
                  required
                  placeholder="e.g. Groceries"
                />
              </div>
              <div class="finance-field">
                <label class="finance-label" for="budget-cat-limit">Monthly limit</label>
                <FinanceMoneyInput
                  id="budget-cat-limit"
                  v-model="monthlyLimit"
                  placeholder="Optional"
                />
              </div>
              <div class="finance-field">
                <label class="finance-label" for="budget-cat-color">Color</label>
                <input id="budget-cat-color" v-model="color" class="finance-color-input" type="color" />
              </div>
            </div>

            <div class="finance-field finance-cat-layout__icons">
              <p class="finance-label" id="budget-cat-icon-label">Icon</p>
              <div
                class="finance-icon-picker"
                role="listbox"
                aria-labelledby="budget-cat-icon-label"
              >
                <button
                  v-for="option in iconOptions"
                  :key="option.value"
                  class="finance-icon-picker__btn"
                  :class="{ 'is-active': icon === option.value }"
                  type="button"
                  role="option"
                  :aria-selected="icon === option.value"
                  :title="option.label"
                  :style="{ '--cat-accent': color }"
                  @click="icon = option.value"
                >
                  <FinanceCategoryIcon :icon="option.value" />
                  <span>{{ option.label }}</span>
                </button>
              </div>
            </div>

            <div v-if="editingId" class="finance-cat-layout__form-actions">
              <button
                class="finance-modal-secondary"
                type="button"
                @click="resetCreate"
              >
                Cancel edit
              </button>
            </div>
          </form>
        </div>

        <footer class="finance-modal-footer">
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
