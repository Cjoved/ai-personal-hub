const STATUS_LABELS = {
  inbox: 'Inbox',
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
  archived: 'Archived',
  todo_sub: 'To do',
  done_sub: 'Done',
}

export function formatDateLabel(value, timezone = 'Asia/Manila') {
  if (!value) return 'No due date'
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone,
  }).format(new Date(value))
}

export function formatStatusLabel(status) {
  return STATUS_LABELS[status] || String(status || '').replace(/_/g, ' ')
}

export function formatTaskBullet(task, context, { forAi = false } = {}) {
  const lists = context.lists || []
  const spaces = context.spaces || []
  const timezone = context.timezone || 'Asia/Manila'
  const list = lists.find((l) => l.id === task.list_id)
  const space = spaces.find((s) => s.id === (task.space_id || list?.space_id))
  const due = formatDateLabel(task.due_date, timezone)
  const status = formatStatusLabel(task.status)
  const location = [list?.name, space?.name].filter(Boolean).join(' · ') || 'Unknown list'

  let line = `• ${task.title} — ${status}, due ${due}, ${location}`
  if (forAi && task.id) line += ` (ref:${task.id})`
  return line
}

export function formatTaskDetail(task, context, subtasks = []) {
  const lists = context.lists || []
  const spaces = context.spaces || []
  const timezone = context.timezone || 'Asia/Manila'
  const list = lists.find((l) => l.id === task.list_id)
  const space = spaces.find((s) => s.id === (task.space_id || list?.space_id))
  const subLines = subtasks.map((s) => `  • ${s.title} — ${formatStatusLabel(s.status)}`)

  return [
    task.title,
    `Status: ${formatStatusLabel(task.status)}`,
    `Due: ${formatDateLabel(task.due_date, timezone)}`,
    `List: ${list?.name || 'Unknown'} · ${space?.name || 'Unknown space'}`,
    subLines.length ? `Subtasks:\n${subLines.join('\n')}` : '',
  ].filter(Boolean).join('\n')
}

export function formatSpaceBullet(space, lists = []) {
  const names = lists.filter((l) => l.space_id === space.id).map((l) => l.name)
  return names.length ? `• ${space.name} — ${names.join(', ')}` : `• ${space.name}`
}

export function formatListBullet(list, spaceName) {
  return `• ${list.name} — ${spaceName || 'Unknown space'}`
}

export function formatSummaryMessage(summary, timezone = 'Asia/Manila') {
  const today = formatDateLabel(new Date(), timezone)
  return `As of ${today}: ${summary.open} open, ${summary.dueToday} due today, ${summary.overdue} overdue, ${summary.done} completed.`
}

export function formatEmptyTaskList(filter, timezone = 'Asia/Manila') {
  const today = formatDateLabel(new Date(), timezone)
  if (filter === 'today') return `No open tasks due today (${today}).`
  if (filter === 'overdue') return 'No overdue tasks.'
  return 'No tasks match that filter.'
}
