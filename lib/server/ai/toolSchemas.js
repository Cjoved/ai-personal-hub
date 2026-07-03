import { z } from 'zod'

const uuid = z.string().uuid()
const name = z.string().min(1).max(120)
const optionalName = z.string().min(1).max(120).optional()
const priority = z.enum(['urgent', 'high', 'normal', 'low']).optional()
const status = z.enum(['inbox', 'todo', 'in_progress', 'done', 'archived']).optional()
const recurrence = z.enum(['none', 'daily', 'weekly', 'monthly']).optional()

export const READ_TOOLS = new Set([
  'list_spaces',
  'list_lists',
  'list_tasks',
  'get_task',
  'get_summary',
  'search_tasks',
])

export const WRITE_TOOLS = new Set([
  'create_space',
  'update_space',
  'delete_space',
  'create_list',
  'update_list',
  'delete_list',
  'create_task',
  'update_task',
  'complete_task',
  'archive_task',
  'restore_task',
  'delete_task',
  'create_subtask',
  'update_subtask',
  'delete_subtask',
  'suggest_schedule',
  'apply_schedule',
])

export const DESTRUCTIVE_TOOLS = new Set([
  'delete_space',
  'delete_list',
  'delete_task',
  'delete_subtask',
])

const schemas = {
  list_spaces: z.object({}),
  list_lists: z.object({ space: optionalName, space_id: uuid.optional() }),
  list_tasks: z.object({
    filter: z.enum(['all', 'inbox', 'today', 'upcoming', 'overdue', 'high_priority', 'completed', 'archived']).optional(),
    space: optionalName,
    list: optionalName,
    space_id: uuid.optional(),
    list_id: uuid.optional(),
    limit: z.number().int().min(1).max(50).optional(),
  }),
  get_task: z.object({ task_id: uuid.optional(), title: optionalName }),
  get_summary: z.object({}),
  search_tasks: z.object({ query: z.string().min(1).max(200), limit: z.number().int().min(1).max(30).optional() }),

  create_space: z.object({ name }),
  update_space: z.object({ space_id: uuid.optional(), space: optionalName, name: optionalName, icon: z.string().max(4).optional(), color: z.string().max(20).optional() }),
  delete_space: z.object({ space_id: uuid.optional(), space: optionalName }),

  create_list: z.object({ space: optionalName, space_id: uuid.optional(), name }),
  update_list: z.object({ list_id: uuid.optional(), list: optionalName, space: optionalName, name: optionalName }),
  delete_list: z.object({ list_id: uuid.optional(), list: optionalName, space: optionalName }),

  create_task: z.object({
    title: name,
    space: optionalName,
    list: optionalName,
    space_id: uuid.optional(),
    list_id: uuid.optional(),
    description: z.string().max(2000).optional(),
    due_date: z.string().optional(),
    priority: priority,
    status: status,
    tags: z.union([z.string(), z.array(z.string())]).optional(),
  }),
  update_task: z.object({
    task_id: uuid.optional(),
    title: optionalName,
    description: z.string().max(2000).optional().nullable(),
    due_date: z.string().optional().nullable(),
    priority: priority,
    status: status,
    list_id: uuid.optional(),
    list: optionalName,
    space: optionalName,
    tags: z.union([z.string(), z.array(z.string())]).optional(),
    recurrence_rule: recurrence,
    recurrence_interval: z.number().int().min(1).max(365).optional(),
  }),
  complete_task: z.object({ task_id: uuid.optional(), title: optionalName }),
  archive_task: z.object({ task_id: uuid.optional(), title: optionalName }),
  restore_task: z.object({ task_id: uuid.optional(), title: optionalName }),
  delete_task: z.object({ task_id: uuid.optional(), title: optionalName }),

  create_subtask: z.object({ task_id: uuid.optional(), title: optionalName, name: optionalName, subtask_title: optionalName }),
  update_subtask: z.object({
    subtask_id: uuid.optional(),
    title: optionalName,
    status: z.enum(['todo', 'done']).optional(),
  }),
  delete_subtask: z.object({ subtask_id: uuid.optional(), title: optionalName }),

  suggest_schedule: z.object({ space_id: uuid.optional(), list_id: uuid.optional(), space: optionalName, list: optionalName }),
  apply_schedule: z.object({
    updates: z.array(z.object({
      task_id: uuid,
      due_date: z.string(),
    })).min(1).max(20),
  }),
}

export function isReadTool(tool) {
  return READ_TOOLS.has(tool)
}

export function isWriteTool(tool) {
  return WRITE_TOOLS.has(tool)
}

export function isDestructiveTool(tool) {
  return DESTRUCTIVE_TOOLS.has(tool)
}

export function validateToolArgs(tool, args = {}) {
  const schema = schemas[tool]
  if (!schema) {
    return { ok: false, error: `Unknown tool: ${tool}` }
  }
  const parsed = schema.safeParse(args)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join('; ') }
  }
  return { ok: true, data: parsed.data }
}

export function getOpenAiToolDefinitions() {
  const descriptions = {
    list_spaces: 'List all spaces',
    list_lists: 'List task lists, optionally filtered by space',
    list_tasks: 'List tasks with optional filters',
    get_task: 'Get one task with subtasks by id or title',
    get_summary: 'Dashboard summary counts',
    search_tasks: 'Search tasks by title, description, or tags',
    create_space: 'Create a new space (needs confirm)',
    update_space: 'Rename or update a space (needs confirm)',
    delete_space: 'Delete a space and its lists/tasks (needs confirm)',
    create_list: 'Create a list in a space (needs confirm)',
    update_list: 'Rename a list (needs confirm)',
    delete_list: 'Delete a list (needs confirm)',
    create_task: 'Create a task (needs confirm)',
    update_task: 'Update task fields (needs confirm)',
    complete_task: 'Mark task done (needs confirm)',
    archive_task: 'Archive a task (needs confirm)',
    restore_task: 'Restore archived task (needs confirm)',
    delete_task: 'Permanently delete a task (needs confirm)',
    create_subtask: 'Add subtask to a task (needs confirm)',
    update_subtask: 'Update subtask (needs confirm)',
    delete_subtask: 'Delete subtask (needs confirm)',
    suggest_schedule: 'AI suggests due dates for open tasks (preview)',
    apply_schedule: 'Apply batch due date updates (needs confirm)',
  }

  return [...READ_TOOLS, ...WRITE_TOOLS].map((name) => ({
    type: 'function',
    function: {
      name,
      description: descriptions[name] || name,
      parameters: { type: 'object', properties: {} },
    },
  }))
}

export const ACTION_RESPONSE_SCHEMA = `Respond with optional action block when needed:
\`\`\`action
{"phase":"clarify","reply":"one short question"}
\`\`\`
OR for reads:
\`\`\`action
{"phase":"read","tool":"get_summary","args":{}}
\`\`\`
OR for writes (do NOT execute — user must confirm):
\`\`\`action
{"phase":"confirm","tool":"create_list","args":{"space":"Personal","name":"Groceries"},"preview":"Create list Groceries in Personal","destructive":false}
\`\`\`
Always include a short friendly reply outside the block.`
