import { manilaDateKey, todayKeyManila, formatManilaDateLabel } from './manilaTime.js'

const openStatuses = new Set(['inbox', 'todo', 'in_progress'])

function parseDate(value) {
  return value ? new Date(value) : null
}

function isOpenTask(task) {
  return openStatuses.has(task.status)
}

function isDueToday(task) {
  const dueDate = parseDate(task.due_date)
  return Boolean(dueDate && manilaDateKey(dueDate) === todayKeyManila() && isOpenTask(task))
}

function isOverdue(task) {
  const dueDate = parseDate(task.due_date)
  return Boolean(dueDate && manilaDateKey(dueDate) < todayKeyManila() && isOpenTask(task))
}

function formatLocation(task) {
  const space = task.spaces?.name
  const list = task.task_lists?.name
  if (space && list) return `${space} / ${list}`
  if (space) return space
  if (list) return list
  return 'No location'
}

function formatDueDate(value) {
  if (!value) return 'No due date'

  const date = new Date(value)
  const formatter = new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Manila',
  })

  return formatter.format(date)
}

function formatSubtaskNote(task) {
  if (!task.subtaskCount) return ''
  return ` · subtasks ${task.completedSubtaskCount}/${task.subtaskCount}`
}

function formatTaskLine(task, { overdue = false } = {}) {
  const priority = task.priority && task.priority !== 'normal' ? ` [${task.priority}]` : ''
  const location = formatLocation(task)
  const dueLabel = overdue ? 'was due' : 'due'
  const due = formatDueDate(task.due_date)
  const subtasks = formatSubtaskNote(task)

  return `• ${task.title}${priority}\n  ${location} · ${dueLabel} ${due}${subtasks}`
}

function attachSubtaskStats(tasks, subtaskRows = []) {
  const statsByTask = subtaskRows.reduce((groups, subtask) => {
    if (!groups[subtask.task_id]) {
      groups[subtask.task_id] = { total: 0, done: 0 }
    }

    groups[subtask.task_id].total += 1
    if (subtask.status === 'done') groups[subtask.task_id].done += 1
    return groups
  }, {})

  return tasks.map((task) => {
    const stats = statsByTask[task.id]
    if (!stats) return task

    return {
      ...task,
      subtaskCount: stats.total,
      completedSubtaskCount: stats.done,
    }
  })
}

export function reminderTaskCounts(tasks) {
  return {
    overdue: tasks.filter(isOverdue).length,
    dueToday: tasks.filter(isDueToday).length,
  }
}

export function buildReminderTaskSections(tasks) {
  const dueToday = tasks.filter(isDueToday)
  const overdue = tasks.filter(isOverdue)
  const lines = []

  if (overdue.length) {
    lines.push(`Overdue (${overdue.length}):`)
    lines.push(...overdue.map((task) => formatTaskLine(task, { overdue: true })))
    lines.push('')
  }

  if (dueToday.length) {
    lines.push(`Due today (${dueToday.length}):`)
    lines.push(...dueToday.map((task) => formatTaskLine(task)))
    lines.push('')
  }

  if (!overdue.length && !dueToday.length) {
    lines.push('No overdue or due-today tasks. You are clear for now.')
    lines.push('')
  }

  return lines.join('\n').trimEnd()
}

export function buildDailyReminderMessage(tasks, { slot = 'morning' } = {}) {
  const dateLabel = formatManilaDateLabel(new Date())

  const slotTitles = {
    morning: 'Morning Task Reminder',
    noon: 'Midday Task Check-in',
    afternoon: 'Afternoon Task Reminder',
    night: 'Evening Task Summary',
    'monthly-report': 'Monthly Task Report',
  }

  const lines = [
    slotTitles[slot] || 'Task Reminder',
    dateLabel,
    '',
    buildReminderTaskSections(tasks),
    '',
    'Open Personal Tasker to review and update your tasks.',
  ]

  return lines.join('\n')
}

export async function fetchReminderTasks(supabase, userId) {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      id,
      title,
      status,
      priority,
      due_date,
      spaces ( name ),
      task_lists ( name )
    `)
    .eq('user_id', userId)
    .not('status', 'in', '("done","archived")')
    .order('due_date', { ascending: true, nullsFirst: false })

  if (error) throw error

  const tasks = data ?? []
  if (!tasks.length) return []

  const taskIds = tasks.map((task) => task.id)
  const { data: subtaskRows, error: subtaskError } = await supabase
    .from('task_subtasks')
    .select('task_id, status')
    .eq('user_id', userId)
    .in('task_id', taskIds)

  if (subtaskError) throw subtaskError

  return attachSubtaskStats(tasks, subtaskRows ?? [])
}
