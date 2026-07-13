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
const color = ref('#6366f1')
const monthlyLimit = ref('')
const editingId = ref(null)

function resetCreate() {
  name.value = ''
  kind.value = 'expense'
  color.value = '#6366f1'
  monthlyLimit.value = ''
  editingId.value = null
}

function startEdit(category) {
  editingId.value = category.id
  name.value = category.name
  kind.value = category.kind === 'income' ? 'income' : 'expense'
  color.value = category.color || '#6366f1'
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

watch(
  () => props.isOpen,
  (open) => {
    if (open) resetCreate()
  },
)
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-3 sm:items-center" @click.self="emit('close')">
    <div class="tracker-modal w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900">
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 class="type-section-title text-slate-950 dark:text-slate-100">Budget categories</h3>
          <p class="type-body-sm type-muted mt-1">Set optional monthly limits to track remaining budget.</p>
        </div>
        <button class="grid h-10 w-10 place-items-center rounded-xl border" type="button" aria-label="Close" @click="emit('close')">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>

      <p v-if="errorMessage" class="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{{ errorMessage }}</p>

      <ul class="mb-4 max-h-52 space-y-2 overflow-y-auto">
        <li
          v-for="category in categories"
          :key="category.id"
          class="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700"
        >
          <span class="min-w-0">
            <span class="flex items-center gap-2">
              <span class="h-3 w-3 rounded-full" :style="{ background: category.color }"></span>
              <strong class="truncate text-sm">{{ category.name }}</strong>
            </span>
            <span class="type-caption type-muted">
              {{ category.kind }}
              <template v-if="category.monthly_limit != null"> · limit {{ category.monthly_limit }}</template>
            </span>
          </span>
          <span class="flex gap-1">
            <button class="rounded-lg px-2 py-1 text-xs font-bold text-sky-700" type="button" @click="startEdit(category)">Edit</button>
            <button class="rounded-lg px-2 py-1 text-xs font-bold text-rose-600" type="button" @click="emit('delete', category.id)">Delete</button>
          </span>
        </li>
      </ul>

      <form class="space-y-3" @submit.prevent="submit">
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="type-caption mb-1.5 block font-semibold" for="budget-cat-name">Name</label>
            <input id="budget-cat-name" v-model="name" class="type-input w-full rounded-xl border px-3 py-2.5" required />
          </div>
          <div>
            <label class="type-caption mb-1.5 block font-semibold" for="budget-cat-kind">Kind</label>
            <select id="budget-cat-kind" v-model="kind" class="type-input w-full rounded-xl border px-3 py-2.5">
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label class="type-caption mb-1.5 block font-semibold" for="budget-cat-limit">Monthly limit</label>
            <input id="budget-cat-limit" v-model="monthlyLimit" class="type-input w-full rounded-xl border px-3 py-2.5" type="number" min="0" step="0.01" placeholder="Optional" />
          </div>
          <div>
            <label class="type-caption mb-1.5 block font-semibold" for="budget-cat-color">Color</label>
            <input id="budget-cat-color" v-model="color" class="h-10 w-20 rounded-xl border" type="color" />
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <button v-if="editingId" class="rounded-xl border px-3 py-2 text-sm font-bold" type="button" @click="resetCreate">Cancel edit</button>
          <button class="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50" type="submit" :disabled="isSaving || !name.trim()">
            {{ editingId ? 'Save' : 'Add' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
