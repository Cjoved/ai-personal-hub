/** Shared asset-class keys for investment holdings. */

export const FINANCE_ASSET_CLASSES = [
  { value: 'stock', label: 'Stock' },
  { value: 'uitf', label: 'UITF' },
  { value: 'mutual_fund', label: 'Mutual fund' },
  { value: 'mp2', label: 'MP2' },
  { value: 'time_deposit', label: 'Time deposit' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'other', label: 'Other' },
]

export const ASSET_CLASS_COLORS = {
  stock: '#4f46e5',
  uitf: '#7c3aed',
  mutual_fund: '#9333ea',
  mp2: '#0f766e',
  time_deposit: '#0d9488',
  crypto: '#d97706',
  other: '#64748b',
}

export function normalizeAssetClass(value) {
  const key = String(value || '').trim().toLowerCase()
  return FINANCE_ASSET_CLASSES.some((item) => item.value === key) ? key : 'other'
}

export function assetClassLabel(value) {
  const key = normalizeAssetClass(value)
  return FINANCE_ASSET_CLASSES.find((item) => item.value === key)?.label || 'Other'
}
