const openStatuses = new Set(['inbox', 'todo', 'in_progress'])

function startOfToday() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

function endOfToday() {
  const date = startOfToday()
  date.setHours(23, 59, 59, 999)
  return date
}

function parseDate(value) {
  return value ? new Date(value) : null
}

function isOpenTask(task) {
  return openStatuses.has(task.status)
}

function isDueToday(task) {
  const dueDate = parseDate(task.due_date)
  return Boolean(dueDate && dueDate >= startOfToday() && dueDate <= endOfToday() && isOpenTask(task))
}

function isOverdue(task) {
  const dueDate = parseDate(task.due_date)
  return Boolean(dueDate && dueDate < startOfToday() && isOpenTask(task))
}

function formatTaskLine(task) {
  const priority = task.priority && task.priority !== 'normal' ? ` [${task.priority}]` : ''
  return `• ${task.title}${priority}`
}

export function buildDailyReminderMessage(tasks) {
  const dueToday = tasks.filter(isDueToday)
  const overdue = tasks.filter(isOverdue)
  const dateLabel = new Intl.DateTimeFormat('en-PH', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Asia/Manila',
  }).format(new Date())

  const lines = [`Daily Task Reminder`, dateLabel, '']

  if (overdue.length) {
    lines.push(`Overdue (${overdue.length}):`)
    lines.push(...overdue.map(formatTaskLine))
    lines.push('')
  }

  if (dueToday.length) {
    lines.push(`Due today (${dueToday.length}):`)
    lines.push(...dueToday.map(formatTaskLine))
    lines.push('')
  }

  if (!overdue.length && !dueToday.length) {
    lines.push('No overdue or due-today tasks. You are clear for now.')
    lines.push('')
  }

  lines.push('Open Personal Tasker to review and update your tasks.')
  return lines.join('\n')
}

export async function fetchReminderTasks(supabase, userId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, status, priority, due_date')
    .eq('user_id', userId)
    .not('status', 'in', '("done","archived")')
    .order('due_date', { ascending: true, nullsFirst: false })

  if (error) throw error
  return data ?? []
}
