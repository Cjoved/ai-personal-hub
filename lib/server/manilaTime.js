const MANILA_TZ = 'Asia/Manila'

export function manilaDateKey(value = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: MANILA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}

export function todayKeyManila() {
  return manilaDateKey(new Date())
}

export function formatManilaDateLabel(date = new Date()) {
  return new Intl.DateTimeFormat('en-PH', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: MANILA_TZ,
  }).format(date)
}
