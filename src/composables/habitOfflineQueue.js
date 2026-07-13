const QUEUE_KEY = 'tasker:habit-offline-queue'

export function isOnline() {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine !== false
}

function readQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeQueue(items) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items))
}

export async function enqueueHabitCheck(item) {
  const queue = readQueue()
  queue.push({ ...item, queuedAt: Date.now() })
  writeQueue(queue)
  return queue.length
}

export function pendingOfflineCount() {
  return readQueue().length
}

export async function flushHabitOfflineQueue(supabase, userId) {
  const queue = readQueue()
  if (!queue.length || !userId) return { applied: 0, remaining: 0 }

  const remaining = []
  let applied = 0

  for (const item of queue) {
    try {
      if (item.type === 'delete' && item.existingId && !String(item.existingId).startsWith('offline-')) {
        const { error } = await supabase
          .from('habit_checks')
          .delete()
          .eq('id', item.existingId)
          .eq('user_id', userId)
        if (error) throw error
        applied += 1
        continue
      }

      if (item.type === 'upsert' && item.existingId && !String(item.existingId).startsWith('offline-')) {
        const { error } = await supabase
          .from('habit_checks')
          .update({
            status: item.payload.status,
            value: item.payload.value,
            mood: item.payload.mood,
            journal_note: item.payload.journal_note,
            sentiment: item.payload.sentiment,
          })
          .eq('id', item.existingId)
          .eq('user_id', userId)
        if (error) throw error
        applied += 1
        continue
      }

      const { error } = await supabase.from('habit_checks').upsert(
        {
          user_id: userId,
          habit_id: item.payload.habit_id,
          checked_on: item.payload.checked_on,
          status: item.payload.status || 'completed',
          value: item.payload.value ?? null,
          mood: item.payload.mood ?? null,
          journal_note: item.payload.journal_note ?? null,
          sentiment: item.payload.sentiment ?? null,
        },
        { onConflict: 'habit_id,checked_on' },
      )
      if (error) throw error
      applied += 1
    } catch {
      remaining.push(item)
    }
  }

  writeQueue(remaining)
  return { applied, remaining: remaining.length }
}
