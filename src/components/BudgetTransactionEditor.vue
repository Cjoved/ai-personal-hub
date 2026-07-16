<script setup>
import { computed, ref, watch } from 'vue'
import FinanceSelect from './FinanceSelect.vue'
import FinanceMoneyInput from './FinanceMoneyInput.vue'
import FinanceDateInput from './FinanceDateInput.vue'
import { localDateKey } from '../lib/localDate'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  transaction: {
    type: Object,
    default: null,
  },
  categories: {
    type: Array,
    default: () => [],
  },
  accounts: {
    type: Array,
    default: () => [],
  },
  isSaving: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['save', 'close'])

const amount = ref('')
const type = ref('expense')
const categoryId = ref('')
const accountId = ref('')
const note = ref('')
const occurredOn = ref('')

const filteredCategories = computed(() =>
  props.categories.filter((item) => item.kind === type.value),
)

const categoryOptions = computed(() =>
  filteredCategories.value.map((category) => ({
    value: category.id,
    label: category.name,
  })),
)

const accountOptions = computed(() => [
  { value: '', label: 'No account' },
  ...props.accounts.map((account) => ({
    value: account.id,
    label: account.name,
  })),
])

const isValid = computed(() => {
  const value = Number(amount.value)
  return value > 0 && categoryId.value && occurredOn.value
})

function resetForm() {
  if (props.transaction) {
    amount.value = String(props.transaction.amount ?? '')
    type.value = props.transaction.type === 'income' ? 'income' : 'expense'
    categoryId.value = props.transaction.category_id || ''
    accountId.value = props.transaction.account_id || ''
    note.value = props.transaction.note || ''
    occurredOn.value = props.transaction.occurred_on || localDateKey()
  } else {
    amount.value = ''
    type.value = 'expense'
    categoryId.value = ''
    accountId.value = props.accounts[0]?.id || ''
    note.value = ''
    occurredOn.value = localDateKey()
  }
}

function submit() {
  if (!isValid.value || props.isSaving) return
  emit('save', {
    amount: Number(amount.value),
    type: type.value,
    category_id: categoryId.value,
    account_id: accountId.value || null,
    note: note.value.trim(),
    occurred_on: occurredOn.value,
  })
}

function onKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
  }
}

watch(
  () => [props.isOpen, props.transaction],
  () => {
    if (props.isOpen) {
      resetForm()
      window.addEventListener('keydown', onKeydown)
    } else {
      window.removeEventListener('keydown', onKeydown)
    }
  },
  { immediate: true },
)

watch(type, () => {
  if (!filteredCategories.value.some((item) => item.id === categoryId.value)) {
    categoryId.value = filteredCategories.value[0]?.id || ''
  }
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="finance-modal-backdrop"
      role="presentation"
      @click.self="emit('close')"
    >
      <form
        class="finance-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tx-modal-title"
        @submit.prevent="submit"
      >
        <div class="finance-modal-handle" aria-hidden="true"></div>

        <header class="finance-modal-header">
          <div class="min-w-0">
            <p class="finance-kicker">Cashflow</p>
            <h3 id="tx-modal-title" class="finance-modal-title">
              {{ transaction ? 'Edit transaction' : 'Add transaction' }}
            </h3>
            <p class="finance-modal-subtitle">
              Log income or expense against a category and account.
            </p>
          </div>
          <button class="finance-modal-close" type="button" aria-label="Close" @click="emit('close')">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div class="finance-modal-body space-y-4">
          <section class="finance-modal-section">
            <div class="finance-modal-section__head">
              <span class="finance-modal-step">1</span>
              <div>
                <h4 class="finance-modal-section__title">Type & amount</h4>
                <p class="finance-modal-section__hint">Choose expense or income, then enter the amount and date.</p>
              </div>
            </div>

            <div class="finance-toggle-group mb-3" role="group" aria-label="Transaction type">
              <button
                class="finance-toggle finance-toggle--expense"
                :class="{ 'is-active': type === 'expense' }"
                type="button"
                @click="type = 'expense'"
              >
                Expense
              </button>
              <button
                class="finance-toggle finance-toggle--income"
                :class="{ 'is-active': type === 'income' }"
                type="button"
                @click="type = 'income'"
              >
                Income
              </button>
            </div>

            <div class="finance-form-grid finance-form-grid--2">
              <div class="finance-field">
                <label class="finance-label" for="tx-amount">Amount</label>
                <FinanceMoneyInput
                  id="tx-amount"
                  v-model="amount"
                  min="0.01"
                  required
                />
              </div>
              <div class="finance-field">
                <label class="finance-label" for="tx-date">Date</label>
                <FinanceDateInput id="tx-date" v-model="occurredOn" required />
              </div>
            </div>
          </section>

          <section class="finance-modal-section">
            <div class="finance-modal-section__head">
              <span class="finance-modal-step">2</span>
              <div>
                <h4 class="finance-modal-section__title">Classification</h4>
                <p class="finance-modal-section__hint">Pick where this money belongs.</p>
              </div>
            </div>

            <div class="finance-form-grid finance-form-grid--2">
              <div class="finance-field">
                <label class="finance-label" for="tx-category">Category</label>
                <FinanceSelect
                  id="tx-category"
                  v-model="categoryId"
                  :options="categoryOptions"
                  aria-label="Category"
                  placeholder="Select category"
                />
              </div>
              <div class="finance-field">
                <label class="finance-label" for="tx-account">Account</label>
                <FinanceSelect
                  id="tx-account"
                  v-model="accountId"
                  :options="accountOptions"
                  aria-label="Account"
                  placeholder="No account"
                />
              </div>
              <div class="finance-field sm:col-span-2">
                <label class="finance-label" for="tx-note">Note</label>
                <input
                  id="tx-note"
                  v-model="note"
                  class="finance-input"
                  maxlength="120"
                  placeholder="Optional note"
                />
              </div>
            </div>
          </section>
        </div>

        <footer class="finance-modal-footer">
          <button class="finance-modal-secondary" type="button" @click="emit('close')">Cancel</button>
          <button class="finance-primary-btn disabled:opacity-50" type="submit" :disabled="!isValid || isSaving">
            {{ isSaving ? 'Saving…' : transaction ? 'Save changes' : 'Add transaction' }}
          </button>
        </footer>
      </form>
    </div>
  </Teleport>
</template>
