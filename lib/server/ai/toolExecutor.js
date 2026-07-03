import { resolveDueDate } from './dateParse.js'
import {
  formatDateLabel,
  formatEmptyTaskList,
  formatListBullet,
  formatSpaceBullet,
  formatSummaryMessage,
  formatTaskBullet,
  formatTaskDetail,
} from './formatDisplay.js'
import { validateToolArgs } from './toolSchemas.js'

const OPEN_STATUSES = new Set(['inbox', 'todo', 'in_progress'])
const SPACE_COLORS = ['#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#14b8a6', '#6366f1']

export function normalizeName(value) {
  return String(value || '').trim().toLowerCase()
}

export function findSpace(spaces, name) {
  if (!name) return { item: spaces[0] || null, ambiguous: false }
  const target = normalizeName(name)
  const exact = spaces.filter((space) => normalizeName(space.name) === target)
  if (exact.length === 1) return { item: exact[0], ambiguous: false }
  if (exact.length > 1) return { item: null, ambiguous: true, matches: exact }

  const partial = spaces.filter((space) => {
    const n = normalizeName(space.name)
    return n.includes(target) || target.includes(n)
  })
  if (partial.length === 1) return { item: partial[0], ambiguous: false }
  return { item: null, ambiguous: partial.length > 1, matches: partial }
}

export function findList(lists, { listName, spaceId }) {
  const scoped = spaceId ? lists.filter((list) => list.space_id === spaceId) : lists
  if (!listName) return { item: scoped[0] || null, ambiguous: false }

  const target = normalizeName(listName)
  const exact = scoped.filter((list) => normalizeName(list.name) === target)
  if (exact.length === 1) return { item: exact[0], ambiguous: false }
  if (exact.length > 1) return { item: null, ambiguous: true, matches: exact }

  const partial = scoped.filter((list) => {
    const n = normalizeName(list.name)
    return n.includes(target) || target.includes(n)
  })
  if (partial.length === 1) return { item: partial[0], ambiguous: false }
  return { item: null, ambiguous: partial.length > 1, matches: partial }
}

export function findTask(tasks, { taskId, title }) {
  if (taskId) {
    const item = tasks.find((task) => task.id === taskId) || null
    return { item, ambiguous: false }
  }
  if (!title) return { item: null, ambiguous: false }

  const target = normalizeName(title)
  const exact = tasks.filter((task) => normalizeName(task.title) === target)
  if (exact.length === 1) return { item: exact[0], ambiguous: false }

  const partial = tasks.filter((task) => normalizeName(task.title).includes(target))
  if (partial.length === 1) return { item: partial[0], ambiguous: false }
  return { item: null, ambiguous: partial.length > 1, matches: partial }
}

function parseTags(value) {
  if (Array.isArray(value)) return value.map((tag) => String(tag).trim()).filter(Boolean)
  if (!value) return []
  return String(value).split(',').map((tag) => tag.trim()).filter(Boolean)
}

function dateKeyInTimezone(date, timezone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function taskDueDateKey(dueDate, timezone) {
  if (!dueDate) return null
  return dateKeyInTimezone(new Date(dueDate), timezone)
}

function isOpenTask(task) {
  return OPEN_STATUSES.has(task.status)
}

function filterTasks(tasks, filter, timezone = 'Asia/Manila') {
  const todayKey = dateKeyInTimezone(new Date(), timezone)

  switch (filter) {
    case 'inbox':
      return tasks.filter((t) => t.status === 'inbox')
    case 'today':
      return tasks.filter((t) => {
        if (!t.due_date || !isOpenTask(t)) return false
        return taskDueDateKey(t.due_date, timezone) === todayKey
      })
    case 'upcoming':
      return tasks.filter((t) => {
        if (!t.due_date || !isOpenTask(t)) return false
        const dueKey = taskDueDateKey(t.due_date, timezone)
        return dueKey && dueKey > todayKey
      })
    case 'overdue':
      return tasks.filter((t) => {
        if (!t.due_date || !isOpenTask(t)) return false
        const dueKey = taskDueDateKey(t.due_date, timezone)
        return dueKey && dueKey < todayKey
      })
    case 'high_priority':
      return tasks.filter((t) => ['urgent', 'high'].includes(t.priority) && isOpenTask(t))
    case 'completed':
      return tasks.filter((t) => t.status === 'done')
    case 'archived':
      return tasks.filter((t) => t.status === 'archived')
    default:
      return tasks.filter(isOpenTask)
  }
}

function advanceDueDate(dueDate, rule, interval = 1) {
  const date = dueDate ? new Date(dueDate) : new Date()
  if (rule === 'daily') date.setDate(date.getDate() + interval)
  if (rule === 'weekly') date.setDate(date.getDate() + 7 * interval)
  if (rule === 'monthly') date.setMonth(date.getMonth() + interval)
  return date.toISOString()
}

function formatTaskLine(task, context) {
  return formatTaskBullet(task, context)
}

async function loadTasks(client, userId, options = {}) {
  let query = client
    .from('tasks')
    .select('id, title, status, priority, due_date, list_id, space_id, description, tags, recurrence_rule, recurrence_interval, estimated_minutes')
    .eq('user_id', userId)

  if (options.listId) query = query.eq('list_id', options.listId)
  if (options.spaceId) query = query.eq('space_id', options.spaceId)

  const { data, error } = await query.order('due_date', { ascending: true, nullsFirst: false }).limit(options.limit || 500)
  if (error) throw error
  return data || []
}

async function loadSubtasks(client, userId, taskId) {
  const { data, error } = await client
    .from('task_subtasks')
    .select('id, title, status, position, task_id')
    .eq('user_id', userId)
    .eq('task_id', taskId)
    .order('position')
  if (error) throw error
  return data || []
}

function resolveSpace(context, args) {
  if (args.space_id) {
    const item = context.spaces.find((s) => s.id === args.space_id) || null
    return { item, ambiguous: false }
  }
  return findSpace(context.spaces, args.space)
}

function resolveList(context, args, spaceId) {
  if (args.list_id) {
    const item = context.lists.find((l) => l.id === args.list_id) || null
    return { item, ambiguous: false }
  }
  return findList(context.lists, { listName: args.list, spaceId })
}

function resolveTask(context, args) {
  if (args.task_id) {
    const item = context.tasks.find((t) => t.id === args.task_id) || null
    return { item, ambiguous: false }
  }
  return findTask(context.tasks, { title: args.title })
}

const readHandlers = {
  async list_spaces(_client, _userId, _args, context) {
    const lines = context.spaces.map((s) => formatSpaceBullet(s, context.lists))
    return {
      ok: true,
      mutated: false,
      message: lines.length ? lines.join('\n') : 'Walang spaces pa.',
      data: context.spaces,
    }
  },

  async list_lists(_client, _userId, args, context) {
    const space = args.space_id || args.space ? resolveSpace(context, args) : { item: null }
    if (space.ambiguous) {
      return { ok: false, mutated: false, message: 'Maraming space ang tumugma — piliin ang eksaktong pangalan.' }
    }
    const filtered = space.item
      ? context.lists.filter((l) => l.space_id === space.item.id)
      : context.lists
    const lines = filtered.map((l) => {
      const sp = context.spaces.find((s) => s.id === l.space_id)
      return formatListBullet(l, sp?.name)
    })
    return { ok: true, mutated: false, message: lines.length ? lines.join('\n') : 'Walang lists.', data: filtered }
  },

  async list_tasks(_client, _userId, args, context) {
    const space = args.space_id || args.space ? resolveSpace(context, args) : { item: null }
    if (space.ambiguous) {
      return { ok: false, mutated: false, message: 'Maraming space ang tumugma.' }
    }
    const list = args.list_id || args.list ? resolveList(context, args, space.item?.id) : { item: null }
    if (list.ambiguous) {
      return { ok: false, mutated: false, message: 'Maraming list ang tumugma.' }
    }

    let tasks = context.tasks
    if (space.item) tasks = tasks.filter((t) => t.space_id === space.item.id)
    if (list.item) tasks = tasks.filter((t) => t.list_id === list.item.id)
    tasks = filterTasks(tasks, args.filter || 'all', context.timezone)
    const limit = args.limit || 15
    const slice = tasks.slice(0, limit)
    const lines = slice.map((t) => formatTaskLine(t, context))
    const emptyMsg = formatEmptyTaskList(args.filter || 'all', context.timezone)
    return {
      ok: true,
      mutated: false,
      message: lines.length ? lines.join('\n') : emptyMsg,
      data: slice,
    }
  },

  async get_task(client, userId, args, context) {
    const resolved = resolveTask(context, args)
    if (resolved.ambiguous) {
      const names = (resolved.matches || []).map((t) => t.title).join(', ')
      return { ok: false, mutated: false, message: `Maraming task: ${names}. Specify mo ang eksaktong title.` }
    }
    if (!resolved.item) {
      return { ok: false, mutated: false, message: 'Hindi ko mahanap ang task.' }
    }
    const subtasks = await loadSubtasks(client, userId, resolved.item.id)
    const msg = formatTaskDetail(resolved.item, context, subtasks)
    return { ok: true, mutated: false, message: msg, data: { task: resolved.item, subtasks } }
  },

  async get_summary(_client, _userId, _args, context) {
    const { summary } = context
    return {
      ok: true,
      mutated: false,
      message: formatSummaryMessage(summary, context.timezone),
      data: summary,
    }
  },

  async search_tasks(_client, _userId, args, context) {
    const q = normalizeName(args.query)
    const hits = context.tasks.filter((task) => {
      const hay = [task.title, task.description, ...(task.tags || [])].join(' ').toLowerCase()
      return hay.includes(q)
    }).slice(0, args.limit || 10)
    const lines = hits.map((t) => formatTaskLine(t, context))
    return {
      ok: true,
      mutated: false,
      message: lines.length ? lines.join('\n') : 'Walang tumugmang task.',
      data: hits,
    }
  },
}

const writeHandlers = {
  async create_space(client, userId, args, context) {
    const name = args.name.trim()
    const { data, error } = await client
      .from('spaces')
      .insert({
        user_id: userId,
        name,
        icon: name.slice(0, 1).toUpperCase(),
        color: SPACE_COLORS[context.spaces.length % SPACE_COLORS.length],
        position: context.spaces.length,
      })
      .select('id, name')
      .single()
    if (error) return { ok: false, mutated: false, message: error.message }
    await client.from('task_lists').insert({
      user_id: userId,
      space_id: data.id,
      name: 'Inbox',
      position: 0,
    })
    return { ok: true, mutated: true, message: `Nagawa ang space na "${data.name}".`, data }
  },

  async update_space(client, userId, args, context) {
    const resolved = resolveSpace(context, args)
    if (!resolved.item) return { ok: false, mutated: false, message: 'Hindi mahanap ang space.' }
    const patch = {}
    if (args.name) patch.name = args.name.trim()
    if (args.icon) patch.icon = args.icon
    if (args.color) patch.color = args.color
    const { error } = await client.from('spaces').update(patch).eq('id', resolved.item.id).eq('user_id', userId)
    if (error) return { ok: false, mutated: false, message: error.message }
    return { ok: true, mutated: true, message: 'Na-update ang space.' }
  },

  async delete_space(client, userId, args, context) {
    const resolved = resolveSpace(context, args)
    if (!resolved.item) return { ok: false, mutated: false, message: 'Hindi mahanap ang space.' }
    const { error } = await client.from('spaces').delete().eq('id', resolved.item.id).eq('user_id', userId)
    if (error) return { ok: false, mutated: false, message: error.message }
    return { ok: true, mutated: true, message: `Na-delete ang space "${resolved.item.name}" at lahat ng contents.` }
  },

  async create_list(client, userId, args, context) {
    const listName = args.name.trim()
    const space = resolveSpace(context, args)
    if (!space.item) return { ok: false, mutated: false, message: 'Hindi mahanap ang space.' }
    const position = context.lists.filter((l) => l.space_id === space.item.id).length
    const { data, error } = await client
      .from('task_lists')
      .insert({ user_id: userId, space_id: space.item.id, name: listName, position })
      .select('id, name')
      .single()
    if (error) return { ok: false, mutated: false, message: error.message }
    return { ok: true, mutated: true, message: `Nagawa ang list na "${data.name}" sa ${space.item.name}.`, data }
  },

  async update_list(client, userId, args, context) {
    const space = args.space ? resolveSpace(context, args) : { item: null }
    const list = resolveList(context, args, space.item?.id)
    if (!list.item) return { ok: false, mutated: false, message: 'Hindi mahanap ang list.' }
    const patch = {}
    if (args.name) patch.name = args.name.trim()
    const { error } = await client.from('task_lists').update(patch).eq('id', list.item.id).eq('user_id', userId)
    if (error) return { ok: false, mutated: false, message: error.message }
    return { ok: true, mutated: true, message: 'Na-update ang list.' }
  },

  async delete_list(client, userId, args, context) {
    const space = args.space ? resolveSpace(context, args) : { item: null }
    const list = resolveList(context, args, space.item?.id)
    if (!list.item) return { ok: false, mutated: false, message: 'Hindi mahanap ang list.' }
    const { error } = await client.from('task_lists').delete().eq('id', list.item.id).eq('user_id', userId)
    if (error) return { ok: false, mutated: false, message: error.message }
    return { ok: true, mutated: true, message: `Na-delete ang list "${list.item.name}".` }
  },

  async create_task(client, userId, args, context) {
    const title = args.title.trim()
    const space = args.space_id || args.space ? resolveSpace(context, args) : { item: null }
    const list = resolveList(context, args, space.item?.id)
    if (!list.item) return { ok: false, mutated: false, message: 'Hindi mahanap ang list.' }
    const due = resolveDueDate(args.due_date, context.timezone)
    const { data, error } = await client
      .from('tasks')
      .insert({
        user_id: userId,
        space_id: list.item.space_id,
        list_id: list.item.id,
        title,
        description: args.description?.trim() || null,
        status: args.status || 'todo',
        priority: args.priority || 'normal',
        due_date: due,
        tags: parseTags(args.tags),
      })
      .select('id, title')
      .single()
    if (error) return { ok: false, mutated: false, message: error.message }
    return { ok: true, mutated: true, message: `Nagawa ang task na "${data.title}".`, data }
  },

  async update_task(client, userId, args, context) {
    const resolved = resolveTask(context, args)
    if (!resolved.item) return { ok: false, mutated: false, message: 'Hindi mahanap ang task.' }
    const patch = {}
    if (args.title) patch.title = args.title.trim()
    if (args.description !== undefined) patch.description = args.description?.trim() || null
    if (args.priority) patch.priority = args.priority
    if (args.status) patch.status = args.status
    if (args.due_date !== undefined) patch.due_date = args.due_date ? resolveDueDate(args.due_date, context.timezone) : null
    if (args.tags !== undefined) patch.tags = parseTags(args.tags)
    if (args.recurrence_rule) patch.recurrence_rule = args.recurrence_rule
    if (args.recurrence_interval) patch.recurrence_interval = args.recurrence_interval
    if (args.list_id || args.list) {
      const list = resolveList(context, args, resolved.item.space_id)
      if (list.item) {
        patch.list_id = list.item.id
        patch.space_id = list.item.space_id
      }
    }
    const { error } = await client.from('tasks').update(patch).eq('id', resolved.item.id).eq('user_id', userId)
    if (error) return { ok: false, mutated: false, message: error.message }
    return { ok: true, mutated: true, message: 'Na-update ang task.' }
  },

  async complete_task(client, userId, args, context) {
    const resolved = resolveTask(context, args)
    if (!resolved.item) return { ok: false, mutated: false, message: 'Hindi mahanap ang task.' }
    const task = resolved.item
    let patch
    if (task.recurrence_rule && task.recurrence_rule !== 'none') {
      patch = {
        status: task.status === 'inbox' ? 'inbox' : 'todo',
        completed_at: null,
        due_date: advanceDueDate(task.due_date, task.recurrence_rule, task.recurrence_interval || 1),
      }
    } else {
      patch = { status: 'done', completed_at: new Date().toISOString() }
    }
    const { error } = await client.from('tasks').update(patch).eq('id', task.id).eq('user_id', userId)
    if (error) return { ok: false, mutated: false, message: error.message }
    return { ok: true, mutated: true, message: `Tapos na ang "${task.title}".` }
  },

  async archive_task(client, userId, args, context) {
    const resolved = resolveTask(context, args)
    if (!resolved.item) return { ok: false, mutated: false, message: 'Hindi mahanap ang task.' }
    const { error } = await client.from('tasks').update({ status: 'archived' }).eq('id', resolved.item.id).eq('user_id', userId)
    if (error) return { ok: false, mutated: false, message: error.message }
    return { ok: true, mutated: true, message: `Na-archive ang "${resolved.item.title}".` }
  },

  async restore_task(client, userId, args, context) {
    const resolved = resolveTask(context, args)
    if (!resolved.item) return { ok: false, mutated: false, message: 'Hindi mahanap ang task.' }
    const { error } = await client.from('tasks').update({ status: 'todo' }).eq('id', resolved.item.id).eq('user_id', userId)
    if (error) return { ok: false, mutated: false, message: error.message }
    return { ok: true, mutated: true, message: `Na-restore ang "${resolved.item.title}".` }
  },

  async delete_task(client, userId, args, context) {
    const resolved = resolveTask(context, args)
    if (!resolved.item) return { ok: false, mutated: false, message: 'Hindi mahanap ang task.' }
    const { error } = await client.from('tasks').delete().eq('id', resolved.item.id).eq('user_id', userId)
    if (error) return { ok: false, mutated: false, message: error.message }
    return { ok: true, mutated: true, message: `Na-delete ang "${resolved.item.title}".` }
  },

  async create_subtask(client, userId, args, context) {
    const resolved = resolveTask(context, args)
    if (!resolved.item) return { ok: false, mutated: false, message: 'Hindi mahanap ang parent task.' }
    const title = (args.subtask_title || args.name || '').trim()
    if (!title) return { ok: false, mutated: false, message: 'Walang subtask title.' }
    const subtasks = await loadSubtasks(client, userId, resolved.item.id)
    const { data, error } = await client
      .from('task_subtasks')
      .insert({
        user_id: userId,
        task_id: resolved.item.id,
        title,
        status: 'todo',
        position: subtasks.length,
      })
      .select('id, title')
      .single()
    if (error) return { ok: false, mutated: false, message: error.message }
    return { ok: true, mutated: true, message: `Nagdagdag ng subtask "${data.title}".`, data }
  },

  async update_subtask(client, userId, args, _context) {
    if (!args.subtask_id) return { ok: false, mutated: false, message: 'Kailangan ang subtask id.' }
    const patch = {}
    if (args.title) patch.title = args.title.trim()
    if (args.status) {
      patch.status = args.status
      patch.completed_at = args.status === 'done' ? new Date().toISOString() : null
    }
    const { error } = await client.from('task_subtasks').update(patch).eq('id', args.subtask_id).eq('user_id', userId)
    if (error) return { ok: false, mutated: false, message: error.message }
    return { ok: true, mutated: true, message: 'Na-update ang subtask.' }
  },

  async delete_subtask(client, userId, args, _context) {
    if (!args.subtask_id) return { ok: false, mutated: false, message: 'Kailangan ang subtask id.' }
    const { error } = await client.from('task_subtasks').delete().eq('id', args.subtask_id).eq('user_id', userId)
    if (error) return { ok: false, mutated: false, message: error.message }
    return { ok: true, mutated: true, message: 'Na-delete ang subtask.' }
  },

  async apply_schedule(client, userId, args, context) {
    let count = 0
    for (const row of args.updates) {
      const due = resolveDueDate(row.due_date, context.timezone)
      const { error } = await client
        .from('tasks')
        .update({ due_date: due })
        .eq('id', row.task_id)
        .eq('user_id', userId)
      if (error) return { ok: false, mutated: false, message: error.message }
      count += 1
    }
    return { ok: true, mutated: true, message: `Na-schedule ang ${count} task(s).` }
  },
}

export async function executeReadTool(tool, args, ctx) {
  const validated = validateToolArgs(tool, args)
  if (!validated.ok) return { ok: false, mutated: false, message: validated.error }
  const handler = readHandlers[tool]
  if (!handler) return { ok: false, mutated: false, message: `Unknown read tool: ${tool}` }
  return handler(ctx.client, ctx.userId, validated.data, ctx.context)
}

export async function executeWriteTool(tool, args, ctx) {
  const validated = validateToolArgs(tool, args)
  if (!validated.ok) return { ok: false, mutated: false, message: validated.error }
  if (tool === 'suggest_schedule') {
    return { ok: false, mutated: false, message: 'suggest_schedule is preview-only; use apply after confirm.' }
  }
  const handler = writeHandlers[tool]
  if (!handler) return { ok: false, mutated: false, message: `Unknown write tool: ${tool}` }
  return handler(ctx.client, ctx.userId, validated.data, ctx.context)
}

export function buildPreview(tool, args, _context) {
  switch (tool) {
    case 'create_list':
      return `Create list ${args.name} in ${args.space || 'default space'}`
    case 'create_task':
      return `Create task "${args.title}"`
    case 'delete_task':
      return `Delete task "${args.title || args.task_id}"`
    case 'delete_space':
      return `Delete space "${args.space || args.space_id}"`
    case 'delete_list':
      return `Delete list "${args.list || args.list_id}"`
    case 'apply_schedule':
      return `Apply due dates to ${args.updates?.length || 0} tasks`
    default:
      return `${tool.replace(/_/g, ' ')}`
  }
}

export async function refreshContextTasks(client, userId) {
  return loadTasks(client, userId, { limit: 500 })
}
