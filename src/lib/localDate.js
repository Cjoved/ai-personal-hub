/** Device-local calendar date as YYYY-MM-DD (midnight wall-clock rollover). */
export function localDateKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Habit/journal day key (PH-style): rolls at 4:00 AM local.
 * Before 4 AM, the active day is still yesterday.
 */
export function habitDayKey(date = new Date()) {
  const shifted = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  if (date.getHours() < 4) {
    shifted.setDate(shifted.getDate() - 1)
  }
  return localDateKey(shifted)
}
