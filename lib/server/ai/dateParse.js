const RELATIVE_PATTERNS = [
  { pattern: /\b(today|ngayon)\b/i, days: 0 },
  { pattern: /\b(bukas|tomorrow)\b/i, days: 1 },
  { pattern: /\b(yesterday|kahapon)\b/i, days: -1 },
  { pattern: /\bnext week\b/i, days: 7 },
  { pattern: /\bthis week\b/i, days: 3 },
]

function dateKeyInTimezone(date, timezone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function addDaysToDateKey(dateKey, days) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const next = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0))
  return next.toISOString().slice(0, 10)
}

export function parseRelativeDate(text, timezone = 'Asia/Manila') {
  const input = String(text || '').trim()
  if (!input) return null

  if (/^\d{4}-\d{2}-\d{2}/.test(input)) {
    return input.slice(0, 10)
  }

  for (const { pattern, days } of RELATIVE_PATTERNS) {
    if (pattern.test(input)) {
      const today = dateKeyInTimezone(new Date(), timezone)
      return addDaysToDateKey(today, days)
    }
  }

  const parsed = Date.parse(input)
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString()
  }

  return null
}

export function resolveDueDate(value, timezone) {
  if (!value) return null
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return new Date(`${value.slice(0, 10)}T12:00:00.000Z`).toISOString()
  }
  const relative = parseRelativeDate(value, timezone)
  if (relative) {
    return new Date(`${relative}T12:00:00.000Z`).toISOString()
  }
  return null
}
