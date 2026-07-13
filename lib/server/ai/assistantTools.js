import { manilaDateKey } from '../manilaTime.js'
import { formatSpaceBullet, formatSummaryMessage, formatTaskBullet } from './formatDisplay.js'
import { refreshContextTasks } from './toolExecutor.js'
import { ACTION_RESPONSE_SCHEMA } from './toolSchemas.js'

export async function fetchUserSettings(client, userId) {
  const { data, error } = await client
    .from('user_settings')
    .select('timezone')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return { timezone: data?.timezone || 'Asia/Manila' }
}

export async function fetchWorkspaceContext(client, userId, timezone = 'Asia/Manila') {
  const [{ data: spaces, error: spacesError }, { data: lists, error: listsError }] = await Promise.all([
    client.from('spaces').select('id, name, icon, color, position').eq('user_id', userId).order('position'),
    client.from('task_lists').select('id, name, space_id, position').eq('user_id', userId).order('position'),
  ])

  if (spacesError) throw spacesError
  if (listsError) throw listsError

  const tasks = await refreshContextTasks(client, userId)
  const today = manilaDateKey()

  const openTasks = tasks.filter((t) => !['done', 'archived'].includes(t.status))
  const dueToday = openTasks.filter((t) => t.due_date && manilaDateKey(new Date(t.due_date)) === today)
  const overdue = openTasks.filter((t) => t.due_date && manilaDateKey(new Date(t.due_date)) < today)
  const done = tasks.filter((t) => t.status === 'done')

  const spaceLines = (spaces || []).map((space) => formatSpaceBullet(space, lists || []))

  const ctxForFormat = { lists: lists || [], spaces: spaces || [], timezone }
  const taskLines = openTasks.slice(0, 30).map((task) => formatTaskBullet(task, ctxForFormat, { forAi: true }))

  return {
    spaces: spaces || [],
    lists: lists || [],
    tasks,
    timezone,
    summary: {
      open: openTasks.length,
      dueToday: dueToday.length,
      overdue: overdue.length,
      done: done.length,
    },
    contextText: [
      'Spaces and lists:',
      spaceLines.join('\n') || '- (no spaces)',
      '',
      formatSummaryMessage({
        open: openTasks.length,
        dueToday: dueToday.length,
        overdue: overdue.length,
        done: done.length,
      }, timezone),
      '',
      'Recent open tasks (use ref id only in tool args, never show raw ids to user):',
      taskLines.join('\n') || '- (none)',
    ].join('\n'),
  }
}

export function buildAssistantSystemPrompt(workspaceContext) {
  const spaceNames = workspaceContext.spaces.map((s) => s.name).join(', ') || 'none'
  return `You are the Personal Hub task assistant — ONLY help with the Tasker module (spaces, lists, tasks, schedule).
Do not answer questions about habits or finance systems.
Language: mirror the user (Tagalog, Taglish, or English).

Rules:
- YOU decide intent: read query, clarify, or confirm write. Do not guess wrong tool.
- Reads (list_tasks, get_summary, etc.): use phase "read" with correct filter (today, overdue, all).
- Writes (create_list, create_task, delete, etc.): clarify if info missing, else phase "confirm".
- Be brief: max 2 sentences unless listing 3+ tasks.
- Clarify first: if required fields are missing, ask ONE short question. Offer choices: ${spaceNames}.
- Never claim a mutation happened until user taps Execute.
- For destructive actions, name what will be deleted in the preview.
- Parse relative dates (bukas, tomorrow) in timezone ${workspaceContext.timezone}.
- When listing tasks to the user: same format as context — no UUIDs, dates like "July 3, 2026", status labels (Inbox, To do).
- Off-topic: refuse briefly.

${workspaceContext.contextText}

${ACTION_RESPONSE_SCHEMA}`
}

export function parseActionBlock(text) {
  const match = String(text || '').match(/```action\s*([\s\S]*?)```/i)
  if (!match) return null
  try {
    return JSON.parse(match[1].trim())
  } catch {
    return null
  }
}

export function stripActionBlock(text) {
  return String(text || '').replace(/```action\s*[\s\S]*?```/gi, '').trim()
}

export function composeReply(aiText, extra) {
  let reply = stripActionBlock(aiText)
  if (!extra) return reply || 'Okay.'
  if (!extra.ok) return reply ? `${reply}\n\n⚠️ ${extra.message}` : extra.message
  if (!reply) return extra.message
  if (reply.includes(extra.message)) return reply
  return `${reply}\n\n${extra.message}`
}
