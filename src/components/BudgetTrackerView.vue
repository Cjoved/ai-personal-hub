<script setup>
import { computed, toRef } from 'vue'
import DashboardBarChart from './DashboardBarChart.vue'
import DashboardDonutChart from './DashboardDonutChart.vue'
import { formatMoney, shiftMonthKey } from '../composables/useBudget'

const props = defineProps({
  api: {
    type: Object,
    required: true,
  },
  section: {
    type: String,
    default: 'overview',
  },
})

const emit = defineEmits(['create-transaction', 'edit-transaction', 'manage-categories', 'toast'])

const selectedMonth = toRef(props.api, 'selectedMonth')
const filterType = toRef(props.api, 'filterType')
const filterCategoryId = toRef(props.api, 'filterCategoryId')
const monthSummary = toRef(props.api, 'monthSummary')
const categoryProgress = toRef(props.api, 'categoryProgress')
const monthTransactions = toRef(props.api, 'monthTransactions')
const categories = toRef(props.api, 'categories')
const spendDonutSegments = toRef(props.api, 'spendDonutSegments')
const incomeExpenseBars = toRef(props.api, 'incomeExpenseBars')
const isLoading = toRef(props.api, 'isLoading')
const errorMessage = toRef(props.api, 'errorMessage')

const showOverview = computed(() => props.section === 'overview')
const showTransactions = computed(() => props.section === 'transactions')
const showLimits = computed(() => props.section === 'limits')
const showCategories = computed(() => props.section === 'categories')

const monthLabel = computed(() => {
  const [year, month] = String(selectedMonth.value).split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))
})

function categoryName(id) {
  return props.api.categoryById(id)?.name || 'Category'
}

async function onDelete(row) {
  const ok = await props.api.deleteTransaction(row.id)
  emit('toast', {
    type: ok ? 'success' : 'error',
    message: ok ? 'Transaction deleted' : props.api.errorMessage.value || 'Could not delete transaction.',
  })
}
</script>

<template>
  <div class="space-y-5">
    <div
      v-if="!showCategories"
      class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
    >
      <div class="flex items-center gap-2">
        <button class="grid h-10 w-10 place-items-center rounded-xl border" type="button" aria-label="Previous month" @click="selectedMonth = shiftMonthKey(selectedMonth, -1)">‹</button>
        <strong class="min-w-40 text-center type-card-title">{{ monthLabel }}</strong>
        <button class="grid h-10 w-10 place-items-center rounded-xl border" type="button" aria-label="Next month" @click="selectedMonth = shiftMonthKey(selectedMonth, 1)">›</button>
      </div>
      <button
        v-if="showOverview || showTransactions"
        class="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white"
        type="button"
        @click="emit('create-transaction')"
      >
        Add transaction
      </button>
    </div>

    <div
      v-if="showCategories"
      class="rounded-2xl border border-dashed border-emerald-300/60 bg-emerald-50/50 p-8 text-center dark:border-emerald-400/30 dark:bg-emerald-500/5"
    >
      <h2 class="type-page-title text-slate-950 dark:text-slate-100">Categories</h2>
      <p class="type-body-sm type-muted mt-1">Manage income/expense groups and optional monthly limits.</p>
      <button class="mt-4 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white" type="button" @click="emit('manage-categories')">
        Manage categories
      </button>
    </div>

    <p v-if="errorMessage" class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{{ errorMessage }}</p>

    <div v-if="isLoading" class="rounded-2xl border bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800">
      Loading budget...
    </div>

    <template v-else-if="!showCategories">
      <div v-if="showOverview" class="grid gap-3 sm:grid-cols-3">
        <article class="budget-stat-card budget-stat-card--income rounded-2xl p-4">
          <p class="type-caption type-muted">Income</p>
          <p class="mt-1 text-2xl font-black tabular-nums text-emerald-600 dark:text-emerald-300">{{ formatMoney(monthSummary.income) }}</p>
        </article>
        <article class="budget-stat-card budget-stat-card--expense rounded-2xl p-4">
          <p class="type-caption type-muted">Expense</p>
          <p class="mt-1 text-2xl font-black tabular-nums text-rose-600 dark:text-rose-300">{{ formatMoney(monthSummary.expense) }}</p>
        </article>
        <article class="budget-stat-card rounded-2xl p-4">
          <p class="type-caption type-muted">Net</p>
          <p
            class="mt-1 text-2xl font-black tabular-nums"
            :class="monthSummary.net >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'"
          >
            {{ formatMoney(monthSummary.net) }}
          </p>
        </article>
      </div>

      <div v-if="showOverview" class="grid gap-4 lg:grid-cols-2">
        <article class="dashboard-card rounded-2xl p-4">
          <h3 class="type-card-title mb-3">Spend by category</h3>
          <DashboardDonutChart :segments="spendDonutSegments" center-label="Spent" empty-label="No expenses this month." />
        </article>
        <article class="dashboard-card rounded-2xl p-4">
          <h3 class="type-card-title mb-3">Income vs expense</h3>
          <DashboardBarChart :items="incomeExpenseBars" empty-label="No transactions this month." />
        </article>
      </div>

      <article v-if="showLimits || showOverview" class="dashboard-card rounded-2xl p-4">
        <h3 class="type-card-title mb-3">Category limits</h3>
        <div v-if="!categoryProgress.length" class="type-body-sm type-muted">Set monthly limits on categories to track remaining budget.</div>
        <div v-else class="space-y-3">
          <div v-for="row in categoryProgress" :key="row.category.id" class="space-y-1.5">
            <div class="flex items-center justify-between gap-2 text-sm font-semibold">
              <span class="flex min-w-0 items-center gap-2">
                <span class="h-2.5 w-2.5 rounded-full" :style="{ background: row.category.color }"></span>
                <span class="truncate">{{ row.category.name }}</span>
              </span>
              <span class="shrink-0 tabular-nums" :class="row.over ? 'text-rose-600' : 'text-slate-600 dark:text-slate-300'">
                <template v-if="row.limit != null">
                  {{ formatMoney(row.spent) }} / {{ formatMoney(row.limit) }}
                  <span v-if="row.over"> · over</span>
                  <span v-else> · {{ formatMoney(row.remaining) }} left</span>
                </template>
                <template v-else>{{ formatMoney(row.spent) }}</template>
              </span>
            </div>
            <div v-if="row.limit != null" class="budget-limit-track h-2.5 overflow-hidden rounded-full">
              <span
                class="block h-full rounded-full transition-all duration-200"
                :class="row.over ? 'bg-rose-500' : 'bg-emerald-500'"
                :style="{ width: `${Math.min(row.pct, 100)}%` }"
              />
            </div>
          </div>
        </div>
      </article>

      <article v-if="showTransactions" class="dashboard-card rounded-2xl p-4">
        <div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 class="type-card-title">Transactions</h3>
          <div class="flex flex-wrap gap-2">
            <select v-model="filterType" class="type-input rounded-xl border px-3 py-2 text-sm" aria-label="Filter by type">
              <option value="all">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <select v-model="filterCategoryId" class="type-input rounded-xl border px-3 py-2 text-sm" aria-label="Filter by category">
              <option value="all">All categories</option>
              <option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option>
            </select>
          </div>
        </div>

        <div v-if="!monthTransactions.length" class="rounded-xl border border-dashed p-6 text-center type-body-sm type-muted">
          No transactions for this month yet.
        </div>
        <ul v-else class="divide-y divide-slate-200 dark:divide-slate-700">
          <li
            v-for="row in monthTransactions"
            :key="row.id"
            class="flex flex-wrap items-center justify-between gap-3 py-3"
          >
            <div class="min-w-0">
              <p class="font-semibold text-slate-900 dark:text-slate-100">{{ categoryName(row.category_id) }}</p>
              <p class="type-caption type-muted">
                {{ row.occurred_on }}
                <span v-if="row.note"> · {{ row.note }}</span>
              </p>
            </div>
            <div class="flex items-center gap-2">
              <strong
                class="tabular-nums"
                :class="row.type === 'income' ? 'text-emerald-600' : 'text-rose-600'"
              >
                {{ row.type === 'income' ? '+' : '-' }}{{ formatMoney(row.amount) }}
              </strong>
              <button class="rounded-lg px-2 py-1 text-xs font-bold text-sky-700" type="button" @click="emit('edit-transaction', row)">Edit</button>
              <button class="rounded-lg px-2 py-1 text-xs font-bold text-rose-600" type="button" @click="onDelete(row)">Delete</button>
            </div>
          </li>
        </ul>
      </article>
    </template>
  </div>
</template>
