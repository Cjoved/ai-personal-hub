import { computed, ref, watch } from 'vue'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

const DEFAULT_BUDGET_CATEGORIES = [
  { name: 'Food', kind: 'expense', color: '#f97316', monthly_limit: 8000 },
  { name: 'Transport', kind: 'expense', color: '#3b82f6', monthly_limit: 3000 },
  { name: 'Bills', kind: 'expense', color: '#8b5cf6', monthly_limit: 5000 },
  { name: 'Shopping', kind: 'expense', color: '#ec4899', monthly_limit: 4000 },
  { name: 'Salary', kind: 'income', color: '#22c55e', monthly_limit: null },
  { name: 'Other', kind: 'expense', color: '#64748b', monthly_limit: null },
]

export function monthKeyFromDate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function monthBounds(monthKey) {
  const [year, month] = String(monthKey).split('-').map(Number)
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0)
  const end = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
  return { start, end, year, month }
}

export function formatMoney(amount, currency = 'PHP') {
  const value = Number(amount) || 0
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `₱${value.toFixed(2)}`
  }
}

/** Format units / unit prices with up to 8 fraction digits (trim trailing zeros). */
export function formatInvestNumber(amount, maxDigits = 8) {
  const value = Number(amount)
  if (!Number.isFinite(value)) return '0'
  const digits = Math.min(Math.max(Number(maxDigits) || 8, 0), 8)
  const fixed = value.toFixed(digits)
  if (!fixed.includes('.')) return fixed
  return fixed.replace(/\.?0+$/, '') || '0'
}

export function shiftMonthKey(monthKey, delta) {
  const [year, month] = String(monthKey).split('-').map(Number)
  const date = new Date(year, month - 1 + delta, 1)
  return monthKeyFromDate(date)
}

export function useBudget(user) {
  const categories = ref([])
  const transactions = ref([])
  const isLoading = ref(false)
  const errorMessage = ref('')
  const selectedMonth = ref(monthKeyFromDate())
  const filterType = ref('all')
  const filterCategoryId = ref('all')

  const userId = computed(() => user.value?.id)

  const expenseCategories = computed(() =>
    categories.value.filter((item) => item.kind === 'expense').sort((a, b) => a.name.localeCompare(b.name)),
  )

  const incomeCategories = computed(() =>
    categories.value.filter((item) => item.kind === 'income').sort((a, b) => a.name.localeCompare(b.name)),
  )

  const monthTransactions = computed(() => {
    let rows = [...transactions.value]
    if (filterType.value !== 'all') {
      rows = rows.filter((row) => row.type === filterType.value)
    }
    if (filterCategoryId.value !== 'all') {
      rows = rows.filter((row) => row.category_id === filterCategoryId.value)
    }
    return rows.sort((a, b) => String(b.occurred_on).localeCompare(String(a.occurred_on)))
  })

  const monthSummary = computed(() => {
    let income = 0
    let expense = 0
    for (const row of transactions.value) {
      const amount = Number(row.amount) || 0
      if (row.type === 'income') income += amount
      else expense += amount
    }
    return {
      income,
      expense,
      net: income - expense,
    }
  })

  const categoryProgress = computed(() =>
    categories.value
      .map((category) => {
        const spent = transactions.value
          .filter((row) => row.category_id === category.id)
          .reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
        const limit = category.monthly_limit != null ? Number(category.monthly_limit) : null
        const remaining = limit != null ? limit - spent : null
        const pct = limit ? Math.min(100, Math.round((spent / limit) * 100)) : 0
        const over = limit != null && spent > limit
        return {
          category,
          spent,
          limit,
          remaining,
          pct,
          over,
        }
      })
      .filter((row) => row.limit != null || row.spent > 0)
      .sort((a, b) => b.spent - a.spent),
  )

  const spendDonutSegments = computed(() =>
    expenseCategories.value
      .map((category) => {
        const value = transactions.value
          .filter((row) => row.category_id === category.id && row.type === 'expense')
          .reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
        return {
          label: category.name,
          value: Math.round(value * 100) / 100,
          color: category.color || '#ef4444',
        }
      })
      .filter((segment) => segment.value > 0),
  )

  const incomeExpenseBars = computed(() => [
    {
      label: 'Income',
      value: Math.round(monthSummary.value.income * 100) / 100,
      color: '#22c55e',
    },
    {
      label: 'Expense',
      value: Math.round(monthSummary.value.expense * 100) / 100,
      color: '#ef4444',
    },
  ])

  async function ensureDefaultCategories() {
    if (!userId.value || categories.value.length) return

    const rows = DEFAULT_BUDGET_CATEGORIES.map((item) => ({
      user_id: userId.value,
      ...item,
    }))

    const { data, error } = await supabase.from('budget_categories').insert(rows).select()
    if (error) {
      errorMessage.value = error.message
      return
    }
    categories.value = data ?? []
  }

  async function fetchBudget() {
    if (!userId.value || !isSupabaseConfigured) {
      categories.value = []
      transactions.value = []
      return
    }

    isLoading.value = true
    errorMessage.value = ''

    const { start, end } = monthBounds(selectedMonth.value)

    const [categoryResult, transactionResult] = await Promise.all([
      supabase.from('budget_categories').select('*').eq('user_id', userId.value).order('name'),
      supabase
        .from('budget_transactions')
        .select('*')
        .eq('user_id', userId.value)
        .gte('occurred_on', start)
        .lte('occurred_on', end)
        .order('occurred_on', { ascending: false }),
    ])

    if (categoryResult.error || transactionResult.error) {
      errorMessage.value = categoryResult.error?.message || transactionResult.error?.message || 'Failed to load budget.'
      isLoading.value = false
      return
    }

    categories.value = categoryResult.data ?? []
    transactions.value = transactionResult.data ?? []
    await ensureDefaultCategories()
    isLoading.value = false
  }

  async function createCategory(payload) {
    if (!userId.value || !payload.name?.trim()) return false
    errorMessage.value = ''

    const { data, error } = await supabase
      .from('budget_categories')
      .insert({
        user_id: userId.value,
        name: payload.name.trim(),
        kind: payload.kind === 'income' ? 'income' : 'expense',
        color: payload.color || '#6366f1',
        monthly_limit: payload.monthly_limit ? Number(payload.monthly_limit) : null,
      })
      .select()
      .single()

    if (error) {
      errorMessage.value = error.message
      return false
    }

    categories.value = [...categories.value, data]
    return true
  }

  async function updateCategory(id, payload) {
    if (!userId.value || !id) return false
    errorMessage.value = ''

    const { data, error } = await supabase
      .from('budget_categories')
      .update({
        name: payload.name?.trim(),
        kind: payload.kind === 'income' ? 'income' : 'expense',
        color: payload.color,
        monthly_limit: payload.monthly_limit ? Number(payload.monthly_limit) : null,
      })
      .eq('id', id)
      .eq('user_id', userId.value)
      .select()
      .single()

    if (error) {
      errorMessage.value = error.message
      return false
    }

    categories.value = categories.value.map((item) => (item.id === id ? data : item))
    return true
  }

  async function deleteCategory(id) {
    if (!userId.value || !id) return false
    errorMessage.value = ''

    const inUse = transactions.value.some((row) => row.category_id === id)
    if (inUse) {
      errorMessage.value = 'Delete or reassign transactions in this category first.'
      return false
    }

    const { error } = await supabase.from('budget_categories').delete().eq('id', id).eq('user_id', userId.value)
    if (error) {
      errorMessage.value = error.message
      return false
    }

    categories.value = categories.value.filter((item) => item.id !== id)
    if (filterCategoryId.value === id) filterCategoryId.value = 'all'
    return true
  }

  async function createTransaction(payload) {
    if (!userId.value || !payload.category_id || !payload.amount) return false
    errorMessage.value = ''

    const amount = Number(payload.amount)
    if (!(amount > 0)) {
      errorMessage.value = 'Amount must be greater than zero.'
      return false
    }

    const { data, error } = await supabase
      .from('budget_transactions')
      .insert({
        user_id: userId.value,
        category_id: payload.category_id,
        amount,
        type: payload.type === 'income' ? 'income' : 'expense',
        note: payload.note?.trim() || null,
        occurred_on: payload.occurred_on || new Date().toISOString().slice(0, 10),
      })
      .select()
      .single()

    if (error) {
      errorMessage.value = error.message
      return false
    }

    const { start, end } = monthBounds(selectedMonth.value)
    if (data.occurred_on >= start && data.occurred_on <= end) {
      transactions.value = [data, ...transactions.value]
    }
    return true
  }

  async function updateTransaction(id, payload) {
    if (!userId.value || !id) return false
    errorMessage.value = ''

    const amount = Number(payload.amount)
    if (!(amount > 0)) {
      errorMessage.value = 'Amount must be greater than zero.'
      return false
    }

    const { data, error } = await supabase
      .from('budget_transactions')
      .update({
        category_id: payload.category_id,
        amount,
        type: payload.type === 'income' ? 'income' : 'expense',
        note: payload.note?.trim() || null,
        occurred_on: payload.occurred_on,
      })
      .eq('id', id)
      .eq('user_id', userId.value)
      .select()
      .single()

    if (error) {
      errorMessage.value = error.message
      return false
    }

    const { start, end } = monthBounds(selectedMonth.value)
    if (data.occurred_on >= start && data.occurred_on <= end) {
      transactions.value = transactions.value.map((row) => (row.id === id ? data : row))
    } else {
      transactions.value = transactions.value.filter((row) => row.id !== id)
    }
    return true
  }

  async function deleteTransaction(id) {
    if (!userId.value || !id) return false
    errorMessage.value = ''

    const { error } = await supabase.from('budget_transactions').delete().eq('id', id).eq('user_id', userId.value)
    if (error) {
      errorMessage.value = error.message
      return false
    }

    transactions.value = transactions.value.filter((row) => row.id !== id)
    return true
  }

  function categoryById(id) {
    return categories.value.find((item) => item.id === id) || null
  }

  watch(
    userId,
    (id) => {
      if (id) fetchBudget()
      else {
        categories.value = []
        transactions.value = []
      }
    },
    { immediate: true },
  )

  watch(selectedMonth, () => {
    if (userId.value) fetchBudget()
  })

  return {
    categories,
    transactions,
    isLoading,
    errorMessage,
    selectedMonth,
    filterType,
    filterCategoryId,
    expenseCategories,
    incomeCategories,
    monthTransactions,
    monthSummary,
    categoryProgress,
    spendDonutSegments,
    incomeExpenseBars,
    fetchBudget,
    createCategory,
    updateCategory,
    deleteCategory,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    categoryById,
  }
}
