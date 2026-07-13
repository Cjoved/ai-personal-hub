<script setup>
import { computed, ref, toRefs, watch } from 'vue'
import DashboardBarChart from './DashboardBarChart.vue'
import DashboardDonutChart from './DashboardDonutChart.vue'
import HabitLiveChart from './HabitLiveChart.vue'
import FinanceAiPanel from './FinanceAiPanel.vue'
import { formatMoney, shiftMonthKey } from '../composables/useFinance'

const props = defineProps({
  api: {
    type: Object,
    required: true,
  },
  section: {
    type: String,
    default: 'dashboard',
  },
})

const emit = defineEmits(['create-transaction', 'edit-transaction', 'manage-categories', 'toast'])

const openModal = ref(null)
const activityTab = ref('transactions')
const budgetTab = ref('limits')
const networthTab = ref('investments')

function syncTabsFromSection(section) {
  if (section === 'accounts') activityTab.value = 'accounts'
  else if (section === 'transactions') activityTab.value = 'transactions'
  else if (section === 'activity') {
    /* keep current activity tab */
  } else if (section === 'subscriptions') budgetTab.value = 'recurring'
  else if (section === 'limits' || section === 'budgets') budgetTab.value = 'limits'
  else if (section === 'budget') {
    /* keep current budget tab */
  } else if (section === 'investments' || section === 'wealth') networthTab.value = 'investments'
  else if (section === 'debts') networthTab.value = 'debts'
  else if (section === 'networth') {
    /* keep current networth tab */
  }
}

syncTabsFromSection(props.section)

watch(
  () => props.section,
  (section) => {
    syncTabsFromSection(section)
  },
)

const resolvedSection = computed(() => {
  const section = props.section
  if (section === 'overview') return 'dashboard'
  if (['activity', 'transactions', 'accounts'].includes(section)) return 'activity'
  if (['budget', 'budgets', 'limits', 'subscriptions'].includes(section)) return 'budget'
  if (['networth', 'wealth', 'investments', 'debts'].includes(section)) return 'networth'
  return section
})

const showDashboard = computed(() => resolvedSection.value === 'dashboard')
const showActivity = computed(() => resolvedSection.value === 'activity')
const showBudget = computed(() => resolvedSection.value === 'budget')
const showNetworth = computed(() => resolvedSection.value === 'networth')
const showGoals = computed(() => resolvedSection.value === 'goals')

function closeModal() {
  openModal.value = null
}

const {
  selectedMonth,
  filterType,
  filterCategoryId,
  filterSearch,
  categories,
  recurring,
  accounts,
  goals,
  liabilities,
  holdings,
  isLoading,
  errorMessage,
  expenseCategories,
  incomeCategories,
  activeAccounts,
  accountBalances,
  monthTransactions,
  monthSummary,
  categoryProgress,
  overLimitCategories,
  spendDonutSegments,
  incomeExpenseBars,
  portfolioRows,
  cashAssets,
  investValue,
  liabilitiesTotal,
  netWorth,
  unrealizedGain,
  allocationSegments,
  netWorthTrend,
} = toRefs(props.api)

const debtMethod = ref('snowball')
const subscriptionsOnly = ref(true)
const isBusy = ref(false)

const accountForm = ref({ name: '', account_type: 'cash', opening_balance: '' })
const transferForm = ref({
  from_account_id: '',
  to_account_id: '',
  amount: '',
  note: '',
  occurred_on: new Date().toISOString().slice(0, 10),
})
const recurringForm = ref({
  name: '',
  amount: '',
  type: 'expense',
  category_id: '',
  account_id: '',
  cadence: 'monthly',
  next_due: new Date().toISOString().slice(0, 10),
  is_subscription: true,
})
const holdingForm = ref({ name: '', asset_class: 'stock', units: '', unit_cost: '' })
const markForm = ref({ holding_id: '', unit_price: '', marked_on: new Date().toISOString().slice(0, 10) })
const dividendForm = ref({ holding_id: '', amount: '', paid_on: new Date().toISOString().slice(0, 10), note: '' })
const goalForm = ref({ name: '', target_amount: '', current_amount: '0', due_on: '' })
const liabilityForm = ref({ name: '', balance: '', apr: '', min_payment: '' })
const paydownForm = ref({ id: '', amount: '' })

const monthLabel = computed(() => {
  const [year, month] = String(selectedMonth.value).split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1),
  )
})

const netWorthChartItems = computed(() =>
  (netWorthTrend.value || []).map((point) => ({
    label: point.label,
    value: point.netWorth,
    sublabel: `Cash ${formatMoney(point.cashAssets)} · Invest ${formatMoney(point.investValue)}`,
  })),
)

const allocationTotal = computed(() =>
  (allocationSegments.value || []).reduce((sum, segment) => sum + (segment.value || 0), 0),
)

const allocationTableRows = computed(() => {
  const total = allocationTotal.value
  if (!total) return []
  return (allocationSegments.value || []).map((segment) => ({
    ...segment,
    pct: Math.round((segment.value / total) * 1000) / 10,
  }))
})

const spendDonutTotal = computed(() =>
  (spendDonutSegments.value || []).reduce((sum, segment) => sum + (segment.value || 0), 0),
)

const spendDonutTableRows = computed(() => {
  const total = spendDonutTotal.value
  if (!total) return []
  return (spendDonutSegments.value || []).map((segment) => ({
    ...segment,
    pct: Math.round((segment.value / total) * 1000) / 10,
  }))
})

const subscriptionRows = computed(() => {
  const rows = recurring.value || []
  if (!subscriptionsOnly.value) return rows
  return rows.filter((row) => row.is_subscription)
})

const debtPlanRows = computed(() => props.api.debtPlan(debtMethod.value))

const filtersActive = computed(
  () =>
    filterType.value !== 'all' ||
    filterCategoryId.value !== 'all' ||
    Boolean(filterSearch.value?.trim()),
)

function clearFilters() {
  filterType.value = 'all'
  filterCategoryId.value = 'all'
  filterSearch.value = ''
}

function gainClass(value) {
  return Number(value) >= 0
    ? 'text-emerald-600 dark:text-emerald-300'
    : 'text-rose-600 dark:text-rose-300'
}

function categoryName(id) {
  return props.api.categoryById(id)?.name || 'Category'
}

function accountName(id) {
  return id ? props.api.accountById(id)?.name || 'Account' : '—'
}

function progressTone(row) {
  if (row.over) return 'over'
  if (row.limit != null && row.pct >= 80) return 'warn'
  return 'ok'
}

function prevMonth() {
  selectedMonth.value = shiftMonthKey(selectedMonth.value, -1)
}

function nextMonth() {
  selectedMonth.value = shiftMonthKey(selectedMonth.value, 1)
}

async function onDeleteTransaction(row) {
  const ok = await props.api.deleteTransaction(row.id)
  emit('toast', {
    type: ok ? 'success' : 'error',
    message: ok ? 'Transaction deleted' : props.api.errorMessage.value || 'Could not delete transaction.',
  })
}

async function onExportCsv() {
  props.api.exportCsv()
  emit('toast', { type: 'success', message: 'CSV export started.' })
}

async function onCreateAccount() {
  if (isBusy.value || !accountForm.value.name.trim()) return
  isBusy.value = true
  const ok = await props.api.createAccount({
    name: accountForm.value.name,
    account_type: accountForm.value.account_type,
    opening_balance: accountForm.value.opening_balance,
  })
  emit('toast', {
    type: ok ? 'success' : 'error',
    message: ok ? 'Account added' : props.api.errorMessage.value || 'Could not add account.',
  })
  if (ok) {
    accountForm.value = { name: '', account_type: 'cash', opening_balance: '' }
    openModal.value = null
  }
  isBusy.value = false
}

async function onArchiveAccount(account) {
  if (isBusy.value) return
  isBusy.value = true
  const ok = await props.api.updateAccount(account.id, { is_archived: true })
  emit('toast', {
    type: ok ? 'success' : 'error',
    message: ok ? 'Account archived' : props.api.errorMessage.value || 'Could not archive account.',
  })
  isBusy.value = false
}

async function onCreateTransfer() {
  if (isBusy.value) return
  isBusy.value = true
  const ok = await props.api.createTransfer({
    ...transferForm.value,
    amount: Number(transferForm.value.amount),
  })
  emit('toast', {
    type: ok ? 'success' : 'error',
    message: ok ? 'Transfer recorded' : props.api.errorMessage.value || 'Could not transfer.',
  })
  if (ok) {
    transferForm.value = {
      from_account_id: '',
      to_account_id: '',
      amount: '',
      note: '',
      occurred_on: new Date().toISOString().slice(0, 10),
    }
    openModal.value = null
  }
  isBusy.value = false
}

async function onCreateRecurring() {
  if (isBusy.value || !recurringForm.value.name.trim() || !recurringForm.value.amount) return
  isBusy.value = true
  const ok = await props.api.createRecurring({
    ...recurringForm.value,
    category_id: recurringForm.value.category_id || null,
    account_id: recurringForm.value.account_id || null,
  })
  emit('toast', {
    type: ok ? 'success' : 'error',
    message: ok ? 'Recurring item created' : props.api.errorMessage.value || 'Could not create recurring item.',
  })
  if (ok) {
    recurringForm.value = {
      name: '',
      amount: '',
      type: 'expense',
      category_id: '',
      account_id: '',
      cadence: 'monthly',
      next_due: new Date().toISOString().slice(0, 10),
      is_subscription: subscriptionsOnly.value,
    }
    openModal.value = null
  }
  isBusy.value = false
}

async function onPostRecurring(row) {
  if (isBusy.value) return
  isBusy.value = true
  const ok = await props.api.postRecurring(row.id)
  emit('toast', {
    type: ok ? 'success' : 'error',
    message: ok ? 'Posted to transactions' : props.api.errorMessage.value || 'Could not post recurring item.',
  })
  isBusy.value = false
}

async function onToggleRecurring(row) {
  if (isBusy.value) return
  isBusy.value = true
  const ok = await props.api.updateRecurring(row.id, { is_active: !row.is_active })
  emit('toast', {
    type: ok ? 'success' : 'error',
    message: ok
      ? row.is_active
        ? 'Recurring item paused'
        : 'Recurring item activated'
      : props.api.errorMessage.value || 'Could not update recurring item.',
  })
  isBusy.value = false
}

async function onCreateHolding() {
  if (isBusy.value || !holdingForm.value.name.trim()) return
  isBusy.value = true
  const ok = await props.api.createHolding({
    name: holdingForm.value.name,
    asset_class: holdingForm.value.asset_class,
    lot: {
      units: holdingForm.value.units,
      unit_cost: holdingForm.value.unit_cost,
    },
  })
  emit('toast', {
    type: ok ? 'success' : 'error',
    message: ok ? 'Holding added' : props.api.errorMessage.value || 'Could not add holding.',
  })
  if (ok) {
    holdingForm.value = { name: '', asset_class: 'stock', units: '', unit_cost: '' }
    openModal.value = null
  }
  isBusy.value = false
}

async function onMarkPrice() {
  if (isBusy.value || !markForm.value.holding_id || markForm.value.unit_price === '') return
  isBusy.value = true
  const ok = await props.api.markPrice(markForm.value.holding_id, {
    unit_price: markForm.value.unit_price,
    marked_on: markForm.value.marked_on,
  })
  emit('toast', {
    type: ok ? 'success' : 'error',
    message: ok ? 'Price updated' : props.api.errorMessage.value || 'Could not update price.',
  })
  if (ok) openModal.value = null
  isBusy.value = false
}

async function onAddDividend() {
  if (isBusy.value || !dividendForm.value.holding_id || !dividendForm.value.amount) return
  isBusy.value = true
  const ok = await props.api.addDividend(dividendForm.value.holding_id, {
    amount: dividendForm.value.amount,
    paid_on: dividendForm.value.paid_on,
    note: dividendForm.value.note,
  })
  emit('toast', {
    type: ok ? 'success' : 'error',
    message: ok ? 'Dividend recorded' : props.api.errorMessage.value || 'Could not record dividend.',
  })
  if (ok) {
    dividendForm.value = { holding_id: '', amount: '', paid_on: new Date().toISOString().slice(0, 10), note: '' }
    openModal.value = null
  }
  isBusy.value = false
}

async function onCreateGoal() {
  if (isBusy.value || !goalForm.value.name.trim() || !goalForm.value.target_amount) return
  isBusy.value = true
  const ok = await props.api.createGoal(goalForm.value)
  emit('toast', {
    type: ok ? 'success' : 'error',
    message: ok ? 'Goal created' : props.api.errorMessage.value || 'Could not create goal.',
  })
  if (ok) {
    goalForm.value = { name: '', target_amount: '', current_amount: '0', due_on: '' }
    openModal.value = null
  }
  isBusy.value = false
}

async function onUpdateGoalAmount(goal, amount) {
  if (isBusy.value) return
  isBusy.value = true
  const ok = await props.api.updateGoal(goal.id, { current_amount: amount })
  emit('toast', {
    type: ok ? 'success' : 'error',
    message: ok ? 'Goal progress updated' : props.api.errorMessage.value || 'Could not update goal.',
  })
  isBusy.value = false
}

async function onCreateLiability() {
  if (isBusy.value || !liabilityForm.value.name.trim()) return
  isBusy.value = true
  const ok = await props.api.createLiability(liabilityForm.value)
  emit('toast', {
    type: ok ? 'success' : 'error',
    message: ok ? 'Debt added' : props.api.errorMessage.value || 'Could not add debt.',
  })
  if (ok) {
    liabilityForm.value = { name: '', balance: '', apr: '', min_payment: '' }
    openModal.value = null
  }
  isBusy.value = false
}

async function onPayDownLiability() {
  if (isBusy.value || !paydownForm.value.id || !paydownForm.value.amount) return
  const liability = (liabilities.value || []).find((row) => row.id === paydownForm.value.id)
  if (!liability) return
  const payment = Number(paydownForm.value.amount) || 0
  const nextBalance = Math.max(0, (Number(liability.balance) || 0) - payment)
  isBusy.value = true
  const ok = await props.api.updateLiability(liability.id, { balance: nextBalance })
  emit('toast', {
    type: ok ? 'success' : 'error',
    message: ok ? 'Payment applied' : props.api.errorMessage.value || 'Could not apply payment.',
  })
  if (ok) paydownForm.value = { id: '', amount: '' }
  isBusy.value = false
}

async function onCreateFromProposal(proposal) {
  const ok = await props.api.createTransaction({
    category_id: proposal.categoryId,
    amount: proposal.amount,
    type: proposal.type,
    account_id: proposal.accountId,
    note: proposal.note,
    occurred_on: proposal.occurred_on,
  })
  emit('toast', {
    type: ok ? 'success' : 'error',
    message: ok ? 'Transaction created from AI' : props.api.errorMessage.value || 'Could not create transaction.',
  })
}
</script>

<template>
  <div class="finance-shell space-y-5">
    <p
      v-if="errorMessage"
      class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
      role="alert"
    >
      {{ errorMessage }}
    </p>

    <div
      v-if="isLoading"
      class="finance-panel text-center text-sm text-slate-500"
      aria-live="polite"
    >
      Loading finance data…
    </div>

    <template v-else>
      <!-- ── DASHBOARD ─────────────────────────────────────────────── -->
      <template v-if="showDashboard">
        <section class="finance-hero">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p class="finance-kicker">Monthly overview</p>
              <h1 class="finance-hero-title mt-1">Home</h1>
              <p class="finance-modal-subtitle mt-1">Your personal finances at a glance.</p>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <div class="flex items-center gap-2">
                <button
                  class="finance-action-btn"
                  type="button"
                  aria-label="Previous month"
                  title="Previous month"
                  :disabled="isLoading"
                  @click="prevMonth"
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <strong class="min-w-36 text-center type-card-title">{{ monthLabel }}</strong>
                <button
                  class="finance-action-btn"
                  type="button"
                  aria-label="Next month"
                  title="Next month"
                  :disabled="isLoading"
                  @click="nextMonth"
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </div>
              <button class="finance-primary-btn" type="button" @click="emit('create-transaction')">
                Add transaction
              </button>
            </div>
          </div>

          <div class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div>
              <p class="finance-label">Net worth</p>
              <p class="mt-1 text-3xl font-black tabular-nums" :class="gainClass(netWorth)">
                {{ formatMoney(netWorth) }}
              </p>
            </div>
            <div>
              <p class="finance-label">Cash &amp; wallets</p>
              <p class="mt-1 text-xl font-bold tabular-nums text-blue-700 dark:text-blue-300">
                {{ formatMoney(cashAssets) }}
              </p>
            </div>
            <div>
              <p class="finance-label">Investments</p>
              <p class="mt-1 text-xl font-bold tabular-nums text-blue-700 dark:text-blue-300">
                {{ formatMoney(investValue) }}
              </p>
            </div>
            <div>
              <p class="finance-label">Liabilities</p>
              <p class="mt-1 text-xl font-bold tabular-nums text-rose-600 dark:text-rose-300">
                {{ formatMoney(liabilitiesTotal) }}
              </p>
            </div>
            <div>
              <p class="finance-label">Unrealized gain</p>
              <p class="mt-1 text-xl font-bold tabular-nums" :class="gainClass(unrealizedGain)">
                {{ formatMoney(unrealizedGain) }}
              </p>
            </div>
          </div>
        </section>

        <div class="grid gap-3 sm:grid-cols-3">
          <article class="finance-stat-card finance-stat-card--gain">
            <p class="type-caption type-muted">Income</p>
            <p class="mt-1 text-2xl font-black tabular-nums text-emerald-600 dark:text-emerald-300">
              {{ formatMoney(monthSummary.income) }}
            </p>
          </article>
          <article class="finance-stat-card finance-stat-card--loss">
            <p class="type-caption type-muted">Expense</p>
            <p class="mt-1 text-2xl font-black tabular-nums text-rose-600 dark:text-rose-300">
              {{ formatMoney(monthSummary.expense) }}
            </p>
          </article>
          <article class="finance-stat-card">
            <p class="type-caption type-muted">Net cashflow</p>
            <p class="mt-1 text-2xl font-black tabular-nums" :class="gainClass(monthSummary.net)">
              {{ formatMoney(monthSummary.net) }}
            </p>
          </article>
        </div>

        <div
          v-if="overLimitCategories.length"
          class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
          role="alert"
        >
          <p class="font-bold">Over budget</p>
          <p class="mt-1">
            {{
              overLimitCategories
                .map((row) => `${row.category.name} (${formatMoney(row.spent)} / ${formatMoney(row.limit)})`)
                .join(' · ')
            }}
            — review caps in Budget.
          </p>
        </div>

        <div class="finance-dash-charts">
          <article class="finance-panel finance-dash-trend">
            <div class="mb-3 flex items-end justify-between gap-3">
              <h3 class="type-card-title">Net worth trend</h3>
              <p class="type-caption type-muted hidden sm:block">Last 6 months</p>
            </div>
            <HabitLiveChart
              :items="netWorthChartItems"
              type="line"
              :height="168"
              compact
              value-suffix=""
              color="#1e40af"
              empty-label="Not enough history yet."
            />
          </article>

          <article class="finance-panel finance-dash-donut">
            <h3 class="type-card-title mb-3">Spend by category</h3>
            <DashboardDonutChart
              :segments="spendDonutSegments"
              size="lg"
              layout="stack"
              center-label="Spent"
              empty-label="No expenses this month."
            />
            <table v-if="spendDonutTableRows.length" class="sr-only">
              <caption>Spend by category percentages</caption>
              <thead>
                <tr>
                  <th scope="col">Category</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Share</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in spendDonutTableRows" :key="row.label">
                  <td>{{ row.label }}</td>
                  <td>{{ formatMoney(row.value) }}</td>
                  <td>{{ row.pct }}%</td>
                </tr>
              </tbody>
            </table>
          </article>

          <article class="finance-panel finance-dash-bars">
            <h3 class="type-card-title mb-3">Income vs expense</h3>
            <DashboardBarChart :items="incomeExpenseBars" empty-label="No transactions this month." />
          </article>
        </div>
      </template>

      <!-- ── ACTIVITY (Transactions / Accounts) ───────────────────── -->
      <template v-else-if="showActivity">
        <section class="finance-hero">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p class="finance-kicker">Money moves</p>
              <h1 class="finance-hero-title mt-1">Activity</h1>
              <p class="finance-modal-subtitle mt-1">Transactions and account balances in one place.</p>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <template v-if="activityTab === 'transactions'">
                <div class="flex items-center gap-2">
                  <button
                    class="finance-action-btn"
                    type="button"
                    aria-label="Previous month"
                    title="Previous month"
                    :disabled="isLoading"
                    @click="prevMonth"
                  >
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </button>
                  <strong class="min-w-36 text-center type-card-title">{{ monthLabel }}</strong>
                  <button
                    class="finance-action-btn"
                    type="button"
                    aria-label="Next month"
                    title="Next month"
                    :disabled="isLoading"
                    @click="nextMonth"
                  >
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </button>
                </div>
                <button class="finance-primary-btn" type="button" @click="emit('create-transaction')">
                  Add transaction
                </button>
                <button
                  class="finance-action-btn"
                  type="button"
                  aria-label="Export CSV"
                  title="Export CSV"
                  :disabled="!monthTransactions.length"
                  @click="onExportCsv"
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M12 3v12" />
                    <path d="m8 11 4 4 4-4" />
                    <path d="M5 19h14" />
                  </svg>
                </button>
              </template>
              <template v-else>
                <button class="finance-primary-btn" type="button" @click="openModal = 'account'">
                  Add account
                </button>
                <button
                  class="finance-action-btn"
                  type="button"
                  aria-label="Transfer between accounts"
                  title="Transfer"
                  @click="openModal = 'transfer'"
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M7 10h13l-3-3M17 14H4l3 3" />
                  </svg>
                </button>
              </template>
            </div>
          </div>

          <div class="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Activity sections">
            <button
              class="finance-chip"
              :class="{ 'finance-chip--active': activityTab === 'transactions' }"
              type="button"
              role="tab"
              :aria-selected="activityTab === 'transactions'"
              @click="activityTab = 'transactions'"
            >
              Transactions
            </button>
            <button
              class="finance-chip"
              :class="{ 'finance-chip--active': activityTab === 'accounts' }"
              type="button"
              role="tab"
              :aria-selected="activityTab === 'accounts'"
              @click="activityTab = 'accounts'"
            >
              Accounts
            </button>
          </div>
        </section>

        <template v-if="activityTab === 'transactions'">
        <article class="finance-filter-bar">
          <div class="finance-filter-search">
            <svg class="finance-filter-search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <label class="sr-only" for="finance-tx-search">Search transactions</label>
            <input
              id="finance-tx-search"
              v-model="filterSearch"
              class="finance-filter-search__input"
              type="search"
              placeholder="Search notes, amount cues…"
              aria-label="Search transactions"
            />
            <button
              v-if="filterSearch"
              class="finance-action-btn finance-filter-search__clear !h-9 !w-9 !min-h-0 !min-w-0"
              type="button"
              aria-label="Clear search"
              title="Clear search"
              @click="filterSearch = ''"
            >
              <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="finance-filter-meta">
            <div class="finance-chip-group" role="group" aria-label="Filter by type">
              <button
                class="finance-chip"
                :class="{ 'finance-chip--active': filterType === 'all' }"
                type="button"
                @click="filterType = 'all'"
              >
                All
              </button>
              <button
                class="finance-chip"
                :class="{ 'finance-chip--active': filterType === 'income' }"
                type="button"
                @click="filterType = 'income'"
              >
                Income
              </button>
              <button
                class="finance-chip"
                :class="{ 'finance-chip--active': filterType === 'expense' }"
                type="button"
                @click="filterType = 'expense'"
              >
                Expense
              </button>
              <button
                class="finance-chip"
                :class="{ 'finance-chip--active': filterType === 'transfer' }"
                type="button"
                @click="filterType = 'transfer'"
              >
                Transfer
              </button>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <label class="sr-only" for="finance-tx-category">Category</label>
              <select
                id="finance-tx-category"
                v-model="filterCategoryId"
                class="finance-filter-select"
                aria-label="Filter by category"
              >
                <option value="all">All categories</option>
                <option v-for="category in categories" :key="category.id" :value="category.id">
                  {{ category.name }}
                </option>
              </select>
              <button
                v-if="filtersActive"
                class="finance-chip"
                type="button"
                @click="clearFilters"
              >
                Clear filters
              </button>
            </div>
          </div>
        </article>

        <div v-if="!monthTransactions.length" class="finance-empty">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="mx-auto mb-3 h-10 w-10 opacity-30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.5"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p class="font-semibold">No transactions for {{ monthLabel }}</p>
            <p class="type-caption type-muted mt-1">Add your first income or expense to get started.</p>
            <button class="finance-primary-btn mt-3" type="button" @click="emit('create-transaction')">
              Add transaction
            </button>
          </div>
          <ul v-else class="space-y-3">
            <li
              v-for="row in monthTransactions"
              :key="row.id"
              class="finance-row flex flex-wrap items-center justify-between gap-3"
            >
              <div class="min-w-0">
                <p class="font-semibold text-slate-900 dark:text-slate-100">
                  {{ row.type === 'transfer' ? (row.note || 'Transfer') : categoryName(row.category_id) }}
                </p>
                <p class="finance-label">
                  {{ row.occurred_on }}
                  <span v-if="row.account_id"> · {{ accountName(row.account_id) }}</span>
                  <span v-if="row.note && row.type !== 'transfer'"> · {{ row.note }}</span>
                </p>
              </div>
              <div class="flex items-center gap-1.5">
                <strong
                  class="mr-1 tabular-nums"
                  :class="row.type === 'income' ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'"
                >
                  {{ row.type === 'income' ? '+' : '-' }}{{ formatMoney(row.amount) }}
                </strong>
                <button
                  class="finance-action-btn"
                  type="button"
                  aria-label="Edit transaction"
                  title="Edit"
                  @click="emit('edit-transaction', row)"
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </button>
                <button
                  class="finance-action-btn finance-action-btn--danger"
                  type="button"
                  aria-label="Delete transaction"
                  title="Delete"
                  :disabled="isBusy"
                  @click="onDeleteTransaction(row)"
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6l-1 14H6L5 6" />
                  </svg>
                </button>
              </div>
            </li>
          </ul>
        </template>

        <template v-else>
          <div v-if="!activeAccounts.length" class="finance-empty">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="mx-auto mb-3 h-10 w-10 opacity-30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.5"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <p class="font-semibold">No accounts yet</p>
            <p class="type-caption type-muted mt-1">Add your cash, bank, or e-wallet accounts to track balances.</p>
            <button class="finance-primary-btn mt-3" type="button" @click="openModal = 'account'">
              Add account
            </button>
          </div>
          <ul v-else class="space-y-3">
            <li
              v-for="account in activeAccounts"
              :key="account.id"
              class="finance-row flex flex-wrap items-center justify-between gap-3"
            >
              <div class="min-w-0">
                <p class="font-semibold text-slate-900 dark:text-slate-100">{{ account.name }}</p>
                <p class="type-caption type-muted capitalize">{{ account.account_type }}</p>
              </div>
              <div class="flex items-center gap-3">
                <strong class="tabular-nums" :class="gainClass(accountBalances[account.id] || 0)">
                  {{ formatMoney(accountBalances[account.id] || 0) }}
                </strong>
                <button
                  class="finance-action-btn"
                  type="button"
                  aria-label="Archive account"
                  title="Archive"
                  :disabled="isBusy"
                  @click="onArchiveAccount(account)"
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M3 7h18" />
                    <path d="M5 7v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7" />
                    <path d="M10 11h4" />
                  </svg>
                </button>
              </div>
            </li>
          </ul>
        </template>
      </template>

      <!-- ── BUDGET (Limits / Recurring) ────────────────────────────── -->
      <template v-else-if="showBudget">
        <section class="finance-hero">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p class="finance-kicker">Spend smarter</p>
              <h1 class="finance-hero-title mt-1">Budget</h1>
              <p class="finance-modal-subtitle mt-1">Category limits and recurring bills.</p>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <template v-if="budgetTab === 'limits'">
                <div class="flex items-center gap-2">
                  <button
                    class="finance-action-btn"
                    type="button"
                    aria-label="Previous month"
                    title="Previous month"
                    :disabled="isLoading"
                    @click="prevMonth"
                  >
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </button>
                  <strong class="min-w-36 text-center type-card-title">{{ monthLabel }}</strong>
                  <button
                    class="finance-action-btn"
                    type="button"
                    aria-label="Next month"
                    title="Next month"
                    :disabled="isLoading"
                    @click="nextMonth"
                  >
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </button>
                </div>
                <button
                  class="finance-primary-btn"
                  type="button"
                  @click="emit('manage-categories')"
                >
                  Manage categories
                </button>
              </template>
              <template v-else>
                <button class="finance-primary-btn" type="button" @click="openModal = 'recurring'">
                  Add recurring
                </button>
              </template>
            </div>
          </div>

          <div class="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Budget sections">
            <button
              class="finance-chip"
              :class="{ 'finance-chip--active': budgetTab === 'limits' }"
              type="button"
              role="tab"
              :aria-selected="budgetTab === 'limits'"
              @click="budgetTab = 'limits'"
            >
              Limits
            </button>
            <button
              class="finance-chip"
              :class="{ 'finance-chip--active': budgetTab === 'recurring' }"
              type="button"
              role="tab"
              :aria-selected="budgetTab === 'recurring'"
              @click="budgetTab = 'recurring'"
            >
              Recurring
            </button>
          </div>
        </section>

        <template v-if="budgetTab === 'limits'">
          <article class="finance-panel finance-budget-panel">
            <header class="finance-budget-panel__head">
              <div>
                <h3 class="type-card-title">Category limits</h3>
                <p class="type-body-sm type-muted mt-0.5">How much of each cap you have used this month.</p>
              </div>
              <span v-if="categoryProgress.length" class="finance-budget-chip">
                {{ categoryProgress.filter((row) => row.limit != null).length }} capped
              </span>
            </header>

            <div v-if="!categoryProgress.length" class="finance-empty finance-empty--compact">
              <p class="font-semibold">No limits set yet</p>
              <p class="type-caption type-muted mt-1">Add monthly limits to categories to track spend.</p>
              <button class="finance-primary-btn mt-3" type="button" @click="emit('manage-categories')">
                Manage categories
              </button>
            </div>

            <ul v-else class="finance-limit-list" role="list">
              <li
                v-for="row in categoryProgress"
                :key="row.category.id"
                class="finance-limit-row"
                :class="`finance-limit-row--${progressTone(row)}`"
                :style="{ '--limit-accent': row.category.color || '#1e40af' }"
              >
                <div class="finance-limit-row__top">
                  <div class="finance-limit-row__identity">
                    <span class="finance-limit-swatch" aria-hidden="true" />
                    <div class="min-w-0">
                      <p class="finance-limit-row__name">{{ row.category.name }}</p>
                      <p v-if="row.limit != null" class="finance-limit-row__meta">
                        <template v-if="row.over">Over by {{ formatMoney(Math.abs(row.remaining)) }}</template>
                        <template v-else>{{ formatMoney(row.remaining) }} left</template>
                      </p>
                      <p v-else class="finance-limit-row__meta">No monthly limit</p>
                    </div>
                  </div>
                  <div class="finance-limit-row__figures">
                    <p class="finance-limit-row__spent tabular-nums">
                      <template v-if="row.limit != null">
                        {{ formatMoney(row.spent) }}
                        <span class="finance-limit-row__slash">/</span>
                        {{ formatMoney(row.limit) }}
                      </template>
                      <template v-else>{{ formatMoney(row.spent) }}</template>
                    </p>
                    <p v-if="row.limit != null" class="finance-limit-row__pct tabular-nums">{{ row.pct }}%</p>
                  </div>
                </div>
                <div
                  v-if="row.limit != null"
                  class="finance-limit-meter"
                  role="meter"
                  :aria-valuenow="row.pct"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  :aria-label="`${row.category.name} budget used`"
                >
                  <span
                    class="finance-limit-meter__fill"
                    :style="{ width: `${Math.min(Math.max(row.pct, row.spent > 0 ? 3 : 0), 100)}%` }"
                  />
                </div>
              </li>
            </ul>
          </article>
        </template>

        <template v-else>
          <div class="mb-3 finance-chip-group" role="group" aria-label="Recurring filter">
            <button
              class="finance-chip"
              :class="{ 'finance-chip--active': subscriptionsOnly }"
              type="button"
              @click="subscriptionsOnly = true"
            >
              Subscriptions
            </button>
            <button
              class="finance-chip"
              :class="{ 'finance-chip--active': !subscriptionsOnly }"
              type="button"
              @click="subscriptionsOnly = false"
            >
              All recurring
            </button>
          </div>

          <div v-if="!subscriptionRows.length" class="finance-empty">
            <p class="font-semibold">No recurring items</p>
            <p class="type-caption type-muted mt-1">Track subscriptions and recurring bills in one place.</p>
            <button class="finance-primary-btn mt-3" type="button" @click="openModal = 'recurring'">
              Add recurring
            </button>
          </div>
          <ul v-else class="space-y-3">
            <li
              v-for="row in subscriptionRows"
              :key="row.id"
              class="finance-row flex flex-wrap items-center justify-between gap-3"
            >
              <div class="min-w-0">
                <p class="flex flex-wrap items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                  {{ row.name }}
                  <span
                    v-if="row.is_subscription"
                    class="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-500/20 dark:text-blue-200"
                  >
                    subscription
                  </span>
                  <span
                    v-if="!row.is_active"
                    class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                  >
                    paused
                  </span>
                </p>
                <p class="finance-label">
                  {{ row.cadence }} · next {{ row.next_due }}
                  <span v-if="row.category_id"> · {{ categoryName(row.category_id) }}</span>
                </p>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <strong
                  class="tabular-nums"
                  :class="row.type === 'income' ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'"
                >
                  {{ formatMoney(row.amount) }}
                </strong>
                <button
                  class="finance-action-btn finance-action-btn--success"
                  type="button"
                  aria-label="Post recurring item"
                  title="Post"
                  :disabled="isBusy || !row.is_active"
                  @click="onPostRecurring(row)"
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </button>
                <button
                  class="finance-action-btn"
                  type="button"
                  :aria-label="row.is_active ? 'Pause recurring item' : 'Activate recurring item'"
                  :title="row.is_active ? 'Pause' : 'Activate'"
                  :disabled="isBusy"
                  @click="onToggleRecurring(row)"
                >
                  <svg
                    v-if="row.is_active"
                    class="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <path d="M8 5v14M16 5v14" />
                  </svg>
                  <svg
                    v-else
                    class="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <path d="m7 4 12 8-12 8V4Z" />
                  </svg>
                </button>
              </div>
            </li>
          </ul>
        </template>
      </template>

      <!-- ── NET WORTH (Investments / Debts) ────────────────────────── -->
      <template v-else-if="showNetworth">
        <section class="finance-hero">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p class="finance-kicker">Balance sheet</p>
              <h1 class="finance-hero-title mt-1">Net worth</h1>
              <p class="finance-modal-subtitle mt-1">
                Investments and debts.
                <template v-if="networthTab === 'debts' && liabilities.length">
                  Total owed:
                  <strong class="text-rose-600 dark:text-rose-300">{{ formatMoney(liabilitiesTotal) }}</strong>
                </template>
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <template v-if="networthTab === 'investments'">
                <button class="finance-primary-btn" type="button" @click="openModal = 'holding'">
                  Add holding
                </button>
                <button
                  class="finance-action-btn"
                  type="button"
                  aria-label="Mark price"
                  title="Mark price"
                  @click="openModal = 'mark'"
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M12 3v18" />
                    <path d="M7 8h7a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h8" />
                  </svg>
                </button>
                <button
                  class="finance-action-btn"
                  type="button"
                  aria-label="Add dividend"
                  title="Add dividend"
                  @click="openModal = 'dividend'"
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M12 2v20" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </button>
              </template>
              <template v-else>
                <button class="finance-primary-btn" type="button" @click="openModal = 'debt'">
                  Add debt
                </button>
              </template>
            </div>
          </div>

          <div class="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Net worth sections">
            <button
              class="finance-chip"
              :class="{ 'finance-chip--active': networthTab === 'investments' }"
              type="button"
              role="tab"
              :aria-selected="networthTab === 'investments'"
              @click="networthTab = 'investments'"
            >
              Investments
            </button>
            <button
              class="finance-chip"
              :class="{ 'finance-chip--active': networthTab === 'debts' }"
              type="button"
              role="tab"
              :aria-selected="networthTab === 'debts'"
              @click="networthTab = 'debts'"
            >
              Debts
            </button>
          </div>
        </section>

        <template v-if="networthTab === 'investments'">
          <div v-if="!portfolioRows.length" class="finance-empty">
            <p class="font-semibold">No holdings yet</p>
            <p class="type-caption type-muted mt-1">Add stocks, UITFs, crypto, or other assets to track your portfolio.</p>
            <button class="finance-primary-btn mt-3" type="button" @click="openModal = 'holding'">
              Add holding
            </button>
          </div>
          <template v-else>
            <ul class="space-y-3">
              <li
                v-for="row in portfolioRows"
                :key="row.holding.id"
                class="finance-row flex flex-wrap items-center justify-between gap-3"
              >
                <div class="min-w-0">
                  <p class="font-semibold text-slate-900 dark:text-slate-100">{{ row.holding.name }}</p>
                  <p class="type-caption type-muted capitalize">
                    {{ (row.holding.asset_class || 'other').replace(/_/g, ' ') }}
                    · {{ row.units }} units @ {{ formatMoney(row.price) }}
                  </p>
                </div>
                <div class="text-right">
                  <p class="font-bold tabular-nums">{{ formatMoney(row.marketValue) }}</p>
                  <p class="type-caption tabular-nums" :class="gainClass(row.gain)">
                    {{ formatMoney(row.gain) }}
                    <span v-if="row.cost"> ({{ row.gainPct >= 0 ? '+' : '' }}{{ row.gainPct.toFixed(1) }}%)</span>
                  </p>
                </div>
              </li>
            </ul>

            <article class="finance-panel">
              <h3 class="type-card-title mb-3">Asset allocation</h3>
              <DashboardDonutChart
                :segments="allocationSegments"
                size="lg"
                center-label="Assets"
                empty-label="No assets tracked yet."
              />
              <table v-if="allocationTableRows.length" class="sr-only">
                <caption>Investment allocation percentages</caption>
                <thead>
                  <tr>
                    <th scope="col">Asset</th>
                    <th scope="col">Value</th>
                    <th scope="col">Share</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in allocationTableRows" :key="`inv-${row.label}`">
                    <td>{{ row.label }}</td>
                    <td>{{ formatMoney(row.value) }}</td>
                    <td>{{ row.pct }}%</td>
                  </tr>
                </tbody>
              </table>
            </article>
          </template>
        </template>

        <template v-else>
          <div v-if="!liabilities.length" class="finance-empty">
            <p class="font-semibold">No debts tracked</p>
            <p class="type-caption type-muted mt-1">Add loans or credit cards to generate a payoff plan.</p>
            <button class="finance-primary-btn mt-3" type="button" @click="openModal = 'debt'">
              Add debt
            </button>
          </div>
          <template v-else>
            <ul class="space-y-3">
              <li
                v-for="row in liabilities"
                :key="row.id"
                class="finance-row flex flex-wrap items-center justify-between gap-3"
              >
                <div class="min-w-0">
                  <p class="font-semibold text-slate-900 dark:text-slate-100">{{ row.name }}</p>
                  <p class="finance-label">
                    APR {{ row.apr || 0 }}% · min {{ formatMoney(row.min_payment || 0) }}
                  </p>
                </div>
                <strong class="tabular-nums text-rose-600 dark:text-rose-300">
                  {{ formatMoney(row.balance) }}
                </strong>
              </li>
            </ul>

            <article class="finance-panel">
              <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 class="type-card-title">Payoff plan</h3>
                  <p class="type-body-sm type-muted">Priority order for eliminating debt.</p>
                </div>
                <div class="finance-chip-group" role="group" aria-label="Debt payoff method">
                  <button
                    class="finance-chip"
                    :class="{ 'finance-chip--active': debtMethod === 'snowball' }"
                    type="button"
                    @click="debtMethod = 'snowball'"
                  >
                    Snowball
                  </button>
                  <button
                    class="finance-chip"
                    :class="{ 'finance-chip--active': debtMethod === 'avalanche' }"
                    type="button"
                    @click="debtMethod = 'avalanche'"
                  >
                    Avalanche
                  </button>
                </div>
              </div>

              <ol v-if="debtPlanRows.length" class="list-decimal space-y-2 pl-5 text-sm">
                <li v-for="row in debtPlanRows" :key="row.liability.id">
                  <span class="font-semibold">{{ row.liability.name }}</span>
                  — {{ formatMoney(row.balance) }} at {{ row.apr }}% APR
                </li>
              </ol>
              <p v-else class="type-body-sm type-muted">Add liabilities to see a payoff plan.</p>
            </article>

            <article class="finance-panel">
              <h3 class="type-card-title mb-1">Apply payment</h3>
              <p class="type-body-sm type-muted mb-4">Record a payment to reduce a debt's balance.</p>
              <form class="finance-form-grid finance-form-grid--3" @submit.prevent="onPayDownLiability">
                <div>
                  <label class="finance-label" for="finance-paydown-debt">Debt</label>
                  <select
                    id="finance-paydown-debt"
                    v-model="paydownForm.id"
                    class="finance-input"
                    required
                  >
                    <option value="">Select debt</option>
                    <option v-for="row in liabilities" :key="row.id" :value="row.id">
                      {{ row.name }}
                    </option>
                  </select>
                </div>
                <div>
                  <label class="finance-label" for="finance-paydown-amount">Payment amount</label>
                  <input
                    id="finance-paydown-amount"
                    v-model="paydownForm.amount"
                    class="finance-input"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div class="flex items-end">
                  <button
                    class="finance-primary-btn w-full"
                    type="submit"
                    :disabled="isBusy || !paydownForm.id || !paydownForm.amount"
                  >
                    Apply payment
                  </button>
                </div>
              </form>
            </article>
          </template>
        </template>
      </template>

      <!-- ── GOALS ─────────────────────────────────────────────────── -->
      <template v-else-if="showGoals">
        <section class="finance-hero">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p class="finance-kicker">Save with purpose</p>
              <h1 class="finance-hero-title mt-1">Goals</h1>
              <p class="finance-modal-subtitle mt-1">Track your savings progress towards financial milestones.</p>
            </div>
            <button class="finance-primary-btn" type="button" @click="openModal = 'goal'">
              New goal
            </button>
          </div>
        </section>

        <div v-if="!goals.length" class="finance-empty">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="mx-auto mb-3 h-10 w-10 opacity-30"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.5"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
          </svg>
          <p class="font-semibold">No goals yet</p>
          <p class="type-caption type-muted mt-1">Set a target and track your savings journey.</p>
          <button class="finance-primary-btn mt-3" type="button" @click="openModal = 'goal'">
            Create first goal
          </button>
        </div>
        <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="goal in goals"
            :key="goal.id"
            class="finance-goal-card"
          >
            <div class="flex flex-wrap items-start justify-between gap-2">
              <p class="font-semibold text-slate-900 dark:text-slate-100">{{ goal.name }}</p>
              <p class="text-sm tabular-nums type-muted">
                {{ formatMoney(goal.current_amount) }} / {{ formatMoney(goal.target_amount) }}
              </p>
            </div>
            <p v-if="goal.due_on" class="type-caption type-muted mt-1">Due {{ goal.due_on }}</p>

            <div class="finance-progress mt-3">
              <span
                :style="{
                  width: `${Math.min(100, Math.round(((Number(goal.current_amount) || 0) / (Number(goal.target_amount) || 1)) * 100))}%`,
                }"
              />
            </div>
            <p class="mt-1 text-right text-xs tabular-nums type-muted">
              {{ Math.min(100, Math.round(((Number(goal.current_amount) || 0) / (Number(goal.target_amount) || 1)) * 100)) }}%
            </p>

            <form
              class="mt-3 flex flex-wrap items-end gap-2"
              @submit.prevent="onUpdateGoalAmount(goal, $event.target.elements.current.value)"
            >
              <div class="flex-1">
                <label class="finance-label" :for="`goal-current-${goal.id}`">Update saved</label>
                <input
                  :id="`goal-current-${goal.id}`"
                  class="finance-input tabular-nums"
                  type="number"
                  name="current"
                  min="0"
                  step="0.01"
                  :value="goal.current_amount"
                  :aria-label="`Current amount for ${goal.name}`"
                />
              </div>
              <button
                class="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-blue-700 dark:border-slate-600 dark:text-blue-300"
                type="submit"
                :disabled="isBusy"
              >
                Save
              </button>
            </form>
          </article>
        </div>
      </template>

    </template>

    <FinanceAiPanel :api="api" @toast="emit('toast', $event)" @create-from-proposal="onCreateFromProposal" />

    <!-- ── MODALS ──────────────────────────────────────────────────── -->
    <Teleport to="body">
      <!-- Add Account -->
      <div
        v-if="openModal === 'account'"
        class="finance-modal-backdrop"
        @click.self="closeModal"
      >
        <div class="finance-modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-account-title">
          <div class="finance-modal-handle" aria-hidden="true"></div>
          <div class="finance-modal-header">
            <div>
              <p class="finance-kicker">Accounts</p>
              <h2 id="modal-account-title" class="finance-modal-title">Add account</h2>
              <p class="finance-modal-subtitle">Track a cash, bank, or e-wallet balance.</p>
            </div>
            <button class="finance-modal-close" type="button" aria-label="Close modal" @click="closeModal">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <div class="finance-modal-body">
            <form class="finance-form-grid finance-form-grid--2" @submit.prevent="onCreateAccount">
              <div class="sm:col-span-2">
                <label class="finance-label" for="modal-account-name">Account name</label>
                <input
                  id="modal-account-name"
                  v-model="accountForm.name"
                  class="finance-input"
                  type="text"
                  required
                  placeholder="e.g. BPI Savings"
                />
              </div>
              <div>
                <label class="finance-label" for="modal-account-type">Type</label>
                <select
                  id="modal-account-type"
                  v-model="accountForm.account_type"
                  class="finance-input"
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank</option>
                  <option value="ewallet">E-wallet</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label class="finance-label" for="modal-account-opening">Opening balance</label>
                <input
                  id="modal-account-opening"
                  v-model="accountForm.opening_balance"
                  class="finance-input"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                />
              </div>
              <div class="sm:col-span-2">
                <button
                  class="finance-primary-btn w-full"
                  type="submit"
                  :disabled="isBusy || !accountForm.name.trim()"
                >
                  Add account
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Transfer -->
      <div
        v-if="openModal === 'transfer'"
        class="finance-modal-backdrop"
        @click.self="closeModal"
      >
        <div class="finance-modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-transfer-title">
          <div class="finance-modal-handle" aria-hidden="true"></div>
          <div class="finance-modal-header">
            <div>
              <p class="finance-kicker">Accounts</p>
              <h2 id="modal-transfer-title" class="finance-modal-title">Transfer funds</h2>
              <p class="finance-modal-subtitle">Move money between accounts without affecting cashflow.</p>
            </div>
            <button class="finance-modal-close" type="button" aria-label="Close modal" @click="closeModal">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <div class="finance-modal-body">
            <form class="finance-form-grid finance-form-grid--2" @submit.prevent="onCreateTransfer">
              <div>
                <label class="finance-label" for="modal-transfer-from">From</label>
                <select
                  id="modal-transfer-from"
                  v-model="transferForm.from_account_id"
                  class="finance-input"
                  required
                >
                  <option disabled value="">Select account</option>
                  <option v-for="account in activeAccounts" :key="account.id" :value="account.id">
                    {{ account.name }}
                  </option>
                </select>
              </div>
              <div>
                <label class="finance-label" for="modal-transfer-to">To</label>
                <select
                  id="modal-transfer-to"
                  v-model="transferForm.to_account_id"
                  class="finance-input"
                  required
                >
                  <option disabled value="">Select account</option>
                  <option v-for="account in activeAccounts" :key="account.id" :value="account.id">
                    {{ account.name }}
                  </option>
                </select>
              </div>
              <div>
                <label class="finance-label" for="modal-transfer-amount">Amount</label>
                <input
                  id="modal-transfer-amount"
                  v-model="transferForm.amount"
                  class="finance-input"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label class="finance-label" for="modal-transfer-date">Date</label>
                <input
                  id="modal-transfer-date"
                  v-model="transferForm.occurred_on"
                  class="finance-input"
                  type="date"
                  required
                />
              </div>
              <div class="sm:col-span-2">
                <label class="finance-label" for="modal-transfer-note">Note</label>
                <input
                  id="modal-transfer-note"
                  v-model="transferForm.note"
                  class="finance-input"
                  type="text"
                  maxlength="120"
                  placeholder="Optional"
                />
              </div>
              <div class="sm:col-span-2">
                <button
                  class="finance-primary-btn w-full"
                  type="submit"
                  :disabled="
                    isBusy ||
                    !transferForm.from_account_id ||
                    !transferForm.to_account_id ||
                    !(Number(transferForm.amount) > 0)
                  "
                >
                  Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Recurring / Subscription -->
      <div
        v-if="openModal === 'recurring'"
        class="finance-modal-backdrop"
        @click.self="closeModal"
      >
        <div
          class="finance-modal-panel finance-modal-panel--wide"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-recurring-title"
        >
          <div class="finance-modal-handle" aria-hidden="true"></div>
          <div class="finance-modal-header">
            <div>
              <p class="finance-kicker">Subscriptions</p>
              <h2 id="modal-recurring-title" class="finance-modal-title">Add recurring item</h2>
              <p class="finance-modal-subtitle">Schedule a repeating income or expense.</p>
            </div>
            <button class="finance-modal-close" type="button" aria-label="Close modal" @click="closeModal">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <div class="finance-modal-body">
            <form class="finance-form-grid finance-form-grid--3" @submit.prevent="onCreateRecurring">
              <div class="sm:col-span-2">
                <label class="finance-label" for="modal-recurring-name">Name</label>
                <input
                  id="modal-recurring-name"
                  v-model="recurringForm.name"
                  class="finance-input"
                  type="text"
                  required
                  placeholder="e.g. Netflix"
                />
              </div>
              <div>
                <label class="finance-label" for="modal-recurring-amount">Amount</label>
                <input
                  id="modal-recurring-amount"
                  v-model="recurringForm.amount"
                  class="finance-input"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label class="finance-label" for="modal-recurring-type">Type</label>
                <select
                  id="modal-recurring-type"
                  v-model="recurringForm.type"
                  class="finance-input"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div>
                <label class="finance-label" for="modal-recurring-cadence">Cadence</label>
                <select
                  id="modal-recurring-cadence"
                  v-model="recurringForm.cadence"
                  class="finance-input"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label class="finance-label" for="modal-recurring-category">Category</label>
                <select
                  id="modal-recurring-category"
                  v-model="recurringForm.category_id"
                  class="finance-input"
                >
                  <option value="">None</option>
                  <option
                    v-for="category in recurringForm.type === 'income' ? incomeCategories : expenseCategories"
                    :key="category.id"
                    :value="category.id"
                  >
                    {{ category.name }}
                  </option>
                </select>
              </div>
              <div>
                <label class="finance-label" for="modal-recurring-account">Account</label>
                <select
                  id="modal-recurring-account"
                  v-model="recurringForm.account_id"
                  class="finance-input"
                >
                  <option value="">None</option>
                  <option v-for="account in activeAccounts" :key="account.id" :value="account.id">
                    {{ account.name }}
                  </option>
                </select>
              </div>
              <div>
                <label class="finance-label" for="modal-recurring-due">Next due</label>
                <input
                  id="modal-recurring-due"
                  v-model="recurringForm.next_due"
                  class="finance-input"
                  type="date"
                />
              </div>
              <div class="flex items-end">
                <label class="flex items-center gap-2 text-sm font-semibold">
                  <input v-model="recurringForm.is_subscription" type="checkbox" />
                  Mark as subscription
                </label>
              </div>
              <div class="sm:col-span-2 lg:col-span-3">
                <button
                  class="finance-primary-btn w-full"
                  type="submit"
                  :disabled="isBusy || !recurringForm.name.trim() || !recurringForm.amount"
                >
                  Add recurring item
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Add Holding -->
      <div
        v-if="openModal === 'holding'"
        class="finance-modal-backdrop"
        @click.self="closeModal"
      >
        <div class="finance-modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-holding-title">
          <div class="finance-modal-handle" aria-hidden="true"></div>
          <div class="finance-modal-header">
            <div>
              <p class="finance-kicker">Investments</p>
              <h2 id="modal-holding-title" class="finance-modal-title">Add holding</h2>
              <p class="finance-modal-subtitle">Track a stock, fund, crypto, or other asset.</p>
            </div>
            <button class="finance-modal-close" type="button" aria-label="Close modal" @click="closeModal">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <div class="finance-modal-body">
            <form class="finance-form-grid finance-form-grid--2" @submit.prevent="onCreateHolding">
              <div class="sm:col-span-2">
                <label class="finance-label" for="modal-holding-name">Name</label>
                <input
                  id="modal-holding-name"
                  v-model="holdingForm.name"
                  class="finance-input"
                  type="text"
                  required
                  placeholder="e.g. AAPL"
                />
              </div>
              <div>
                <label class="finance-label" for="modal-holding-class">Asset class</label>
                <select
                  id="modal-holding-class"
                  v-model="holdingForm.asset_class"
                  class="finance-input"
                >
                  <option value="stock">Stock</option>
                  <option value="uitf">UITF</option>
                  <option value="mutual_fund">Mutual fund</option>
                  <option value="crypto">Crypto</option>
                  <option value="time_deposit">Time deposit</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label class="finance-label" for="modal-holding-units">Units</label>
                <input
                  id="modal-holding-units"
                  v-model="holdingForm.units"
                  class="finance-input"
                  type="number"
                  min="0"
                  step="any"
                />
              </div>
              <div>
                <label class="finance-label" for="modal-holding-cost">Unit cost</label>
                <input
                  id="modal-holding-cost"
                  v-model="holdingForm.unit_cost"
                  class="finance-input"
                  type="number"
                  min="0"
                  step="0.01"
                />
              </div>
              <div class="sm:col-span-2">
                <button
                  class="finance-primary-btn w-full"
                  type="submit"
                  :disabled="isBusy || !holdingForm.name.trim()"
                >
                  Add holding
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Mark Price -->
      <div
        v-if="openModal === 'mark'"
        class="finance-modal-backdrop"
        @click.self="closeModal"
      >
        <div class="finance-modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-mark-title">
          <div class="finance-modal-handle" aria-hidden="true"></div>
          <div class="finance-modal-header">
            <div>
              <p class="finance-kicker">Investments</p>
              <h2 id="modal-mark-title" class="finance-modal-title">Mark price</h2>
              <p class="finance-modal-subtitle">Update the current unit price for a holding.</p>
            </div>
            <button class="finance-modal-close" type="button" aria-label="Close modal" @click="closeModal">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <div class="finance-modal-body">
            <form class="grid gap-3" @submit.prevent="onMarkPrice">
              <div>
                <label class="finance-label" for="modal-mark-holding">Holding</label>
                <select
                  id="modal-mark-holding"
                  v-model="markForm.holding_id"
                  class="finance-input"
                  required
                >
                  <option value="">Select holding</option>
                  <option v-for="holding in holdings" :key="holding.id" :value="holding.id">
                    {{ holding.name }}
                  </option>
                </select>
              </div>
              <div>
                <label class="finance-label" for="modal-mark-price">Unit price</label>
                <input
                  id="modal-mark-price"
                  v-model="markForm.unit_price"
                  class="finance-input"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label class="finance-label" for="modal-mark-date">Date</label>
                <input
                  id="modal-mark-date"
                  v-model="markForm.marked_on"
                  class="finance-input"
                  type="date"
                />
              </div>
              <button
                class="finance-primary-btn w-full"
                type="submit"
                :disabled="isBusy || !markForm.holding_id || markForm.unit_price === ''"
              >
                Update price
              </button>
            </form>
          </div>
        </div>
      </div>

      <!-- Add Dividend -->
      <div
        v-if="openModal === 'dividend'"
        class="finance-modal-backdrop"
        @click.self="closeModal"
      >
        <div class="finance-modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-dividend-title">
          <div class="finance-modal-handle" aria-hidden="true"></div>
          <div class="finance-modal-header">
            <div>
              <p class="finance-kicker">Investments</p>
              <h2 id="modal-dividend-title" class="finance-modal-title">Add dividend</h2>
              <p class="finance-modal-subtitle">Record a dividend or interest payment received.</p>
            </div>
            <button class="finance-modal-close" type="button" aria-label="Close modal" @click="closeModal">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <div class="finance-modal-body">
            <form class="finance-form-grid finance-form-grid--2" @submit.prevent="onAddDividend">
              <div class="sm:col-span-2">
                <label class="finance-label" for="modal-div-holding">Holding</label>
                <select
                  id="modal-div-holding"
                  v-model="dividendForm.holding_id"
                  class="finance-input"
                  required
                >
                  <option value="">Select holding</option>
                  <option v-for="holding in holdings" :key="holding.id" :value="holding.id">
                    {{ holding.name }}
                  </option>
                </select>
              </div>
              <div>
                <label class="finance-label" for="modal-div-amount">Amount</label>
                <input
                  id="modal-div-amount"
                  v-model="dividendForm.amount"
                  class="finance-input"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label class="finance-label" for="modal-div-date">Paid on</label>
                <input
                  id="modal-div-date"
                  v-model="dividendForm.paid_on"
                  class="finance-input"
                  type="date"
                />
              </div>
              <div class="sm:col-span-2">
                <label class="finance-label" for="modal-div-note">Note</label>
                <input
                  id="modal-div-note"
                  v-model="dividendForm.note"
                  class="finance-input"
                  type="text"
                  placeholder="Optional"
                />
              </div>
              <div class="sm:col-span-2">
                <button
                  class="finance-primary-btn w-full"
                  type="submit"
                  :disabled="isBusy || !dividendForm.holding_id || !dividendForm.amount"
                >
                  Record dividend
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Create Goal -->
      <div
        v-if="openModal === 'goal'"
        class="finance-modal-backdrop"
        @click.self="closeModal"
      >
        <div class="finance-modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-goal-title">
          <div class="finance-modal-handle" aria-hidden="true"></div>
          <div class="finance-modal-header">
            <div>
              <p class="finance-kicker">Goals</p>
              <h2 id="modal-goal-title" class="finance-modal-title">New savings goal</h2>
              <p class="finance-modal-subtitle">Define a target to save towards.</p>
            </div>
            <button class="finance-modal-close" type="button" aria-label="Close modal" @click="closeModal">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <div class="finance-modal-body">
            <form class="finance-form-grid finance-form-grid--2" @submit.prevent="onCreateGoal">
              <div class="sm:col-span-2">
                <label class="finance-label" for="modal-goal-name">Goal name</label>
                <input
                  id="modal-goal-name"
                  v-model="goalForm.name"
                  class="finance-input"
                  type="text"
                  required
                  placeholder="e.g. Emergency fund"
                />
              </div>
              <div>
                <label class="finance-label" for="modal-goal-target">Target amount</label>
                <input
                  id="modal-goal-target"
                  v-model="goalForm.target_amount"
                  class="finance-input"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label class="finance-label" for="modal-goal-current">Starting amount</label>
                <input
                  id="modal-goal-current"
                  v-model="goalForm.current_amount"
                  class="finance-input"
                  type="number"
                  min="0"
                  step="0.01"
                />
              </div>
              <div class="sm:col-span-2">
                <label class="finance-label" for="modal-goal-due">Due date</label>
                <input
                  id="modal-goal-due"
                  v-model="goalForm.due_on"
                  class="finance-input"
                  type="date"
                />
              </div>
              <div class="sm:col-span-2">
                <button
                  class="finance-primary-btn w-full"
                  type="submit"
                  :disabled="isBusy || !goalForm.name.trim() || !goalForm.target_amount"
                >
                  Create goal
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Add Debt -->
      <div
        v-if="openModal === 'debt'"
        class="finance-modal-backdrop"
        @click.self="closeModal"
      >
        <div class="finance-modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-debt-title">
          <div class="finance-modal-handle" aria-hidden="true"></div>
          <div class="finance-modal-header">
            <div>
              <p class="finance-kicker">Debts</p>
              <h2 id="modal-debt-title" class="finance-modal-title">Add debt</h2>
              <p class="finance-modal-subtitle">Track a loan or credit card balance.</p>
            </div>
            <button class="finance-modal-close" type="button" aria-label="Close modal" @click="closeModal">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <div class="finance-modal-body">
            <form class="finance-form-grid finance-form-grid--2" @submit.prevent="onCreateLiability">
              <div class="sm:col-span-2">
                <label class="finance-label" for="modal-debt-name">Debt name</label>
                <input
                  id="modal-debt-name"
                  v-model="liabilityForm.name"
                  class="finance-input"
                  type="text"
                  required
                  placeholder="e.g. Credit card"
                />
              </div>
              <div>
                <label class="finance-label" for="modal-debt-balance">Balance</label>
                <input
                  id="modal-debt-balance"
                  v-model="liabilityForm.balance"
                  class="finance-input"
                  type="number"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label class="finance-label" for="modal-debt-apr">APR %</label>
                <input
                  id="modal-debt-apr"
                  v-model="liabilityForm.apr"
                  class="finance-input"
                  type="number"
                  min="0"
                  step="0.01"
                />
              </div>
              <div class="sm:col-span-2">
                <label class="finance-label" for="modal-debt-min">Min payment</label>
                <input
                  id="modal-debt-min"
                  v-model="liabilityForm.min_payment"
                  class="finance-input"
                  type="number"
                  min="0"
                  step="0.01"
                />
              </div>
              <div class="sm:col-span-2">
                <button
                  class="finance-primary-btn w-full"
                  type="submit"
                  :disabled="isBusy || !liabilityForm.name.trim()"
                >
                  Add debt
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
