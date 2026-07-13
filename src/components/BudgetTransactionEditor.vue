<script setup>
import { computed, ref, watch } from 'vue'

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
  isSaving: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['save', 'close'])

const amount = ref('')
const type = ref('expense')
const categoryId = ref('')
const note = ref('')
const occurredOn = ref('')

const filteredCategories = computed(() =>
  props.categories.filter((item) => item.kind === type.value),
)

const isValid = computed(() => {
  const value = Number(amount.value)
  return value > 0 && categoryId.value && occurredOn.value
})

function resetForm() {
  if (props.transaction) {
    amount.value = String(props.transaction.amount ?? '')
    type.value = props.transaction.type === 'income' ? 'income' : 'expense'
    categoryId.value = props.transaction.category_id || ''
    note.value = props.transaction.note || ''
    occurredOn.value = props.transaction.occurred_on || new Date().toISOString().slice(0, 10)
  } else {
    amount.value = ''
    type.value = 'expense'
    categoryId.value = ''
    note.value = ''
    occurredOn.value = new Date().toISOString().slice(0, 10)
  }
}

function submit() {
  if (!isValid.value || props.isSaving) return
  emit('save', {
    amount: Number(amount.value),
    type: type.value,
    category_id: categoryId.value,
    note: note.value.trim(),
    occurred_on: occurredOn.value,
  })
}

watch(
  () => [props.isOpen, props.transaction],
  () => {
    if (props.isOpen) resetForm()
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
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-3 sm:items-center" @click.self="emit('close')">
    <form class="tracker-modal w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900" @submit.prevent="submit">
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 class="type-section-title text-slate-950 dark:text-slate-100">
            {{ transaction ? 'Edit transaction' : 'Add transaction' }}
          </h3>
          <p class="type-body-sm type-muted mt-1">Log income or expense against a category.</p>
        </div>
        <button class="grid h-10 w-10 place-items-center rounded-xl border" type="button" aria-label="Close" @click="emit('close')">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>

      <div class="space-y-4">
        <div class="flex gap-2">
          <button
            class="rounded-xl border px-3 py-2 text-sm font-bold"
            :class="type === 'expense' ? 'border-rose-500 bg-rose-500/10 text-rose-700' : ''"
            type="button"
            @click="type = 'expense'"
          >
            Expense
          </button>
          <button
            class="rounded-xl border px-3 py-2 text-sm font-bold"
            :class="type === 'income' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700' : ''"
            type="button"
            @click="type = 'income'"
          >
            Income
          </button>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="type-caption mb-1.5 block font-semibold" for="tx-amount">Amount</label>
            <input id="tx-amount" v-model="amount" class="type-input w-full rounded-xl border px-3 py-2.5" type="number" min="0.01" step="0.01" required />
          </div>
          <div>
            <label class="type-caption mb-1.5 block font-semibold" for="tx-date">Date</label>
            <input id="tx-date" v-model="occurredOn" class="type-input w-full rounded-xl border px-3 py-2.5" type="date" required />
          </div>
        </div>

        <div>
          <label class="type-caption mb-1.5 block font-semibold" for="tx-category">Category</label>
          <select id="tx-category" v-model="categoryId" class="type-input w-full rounded-xl border px-3 py-2.5" required>
            <option disabled value="">Select category</option>
            <option v-for="category in filteredCategories" :key="category.id" :value="category.id">{{ category.name }}</option>
          </select>
        </div>

        <div>
          <label class="type-caption mb-1.5 block font-semibold" for="tx-note">Note</label>
          <input id="tx-note" v-model="note" class="type-input w-full rounded-xl border px-3 py-2.5" maxlength="120" />
        </div>
      </div>

      <div class="mt-5 flex justify-end gap-2">
        <button class="rounded-xl border px-4 py-2.5 text-sm font-bold" type="button" @click="emit('close')">Cancel</button>
        <button class="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50" type="submit" :disabled="!isValid || isSaving">
          {{ isSaving ? 'Saving...' : transaction ? 'Save' : 'Add' }}
        </button>
      </div>
    </form>
  </div>
</template>
