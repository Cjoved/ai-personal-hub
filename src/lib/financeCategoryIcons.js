/** Shared icon keys for budget / finance categories. */

export const FINANCE_CATEGORY_ICONS = [
  { value: 'food', label: 'Food' },
  { value: 'groceries', label: 'Groceries' },
  { value: 'transport', label: 'Transport' },
  { value: 'bills', label: 'Bills' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'salary', label: 'Salary' },
  { value: 'health', label: 'Health' },
  { value: 'home', label: 'Home' },
  { value: 'entertainment', label: 'Fun' },
  { value: 'education', label: 'Education' },
  { value: 'travel', label: 'Travel' },
  { value: 'gift', label: 'Gift' },
  { value: 'coffee', label: 'Coffee' },
  { value: 'phone', label: 'Phone' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'other', label: 'Other' },
]

export function normalizeCategoryIcon(icon) {
  const key = String(icon || '').trim().toLowerCase()
  return FINANCE_CATEGORY_ICONS.some((item) => item.value === key) ? key : 'other'
}
