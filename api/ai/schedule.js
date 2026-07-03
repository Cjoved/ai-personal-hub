import { chatWithProviderChain } from '../../lib/server/ai/providerChain.js'
import { getAdminClient } from '../../lib/server/supabaseAdmin.js'
import { requireUser } from '../../lib/server/authRequest.js'

function buildSchedulePrompt(tasks) {
  const lines = tasks.map(
    (task) =>
      `- id:${task.id} title:${task.title} status:${task.status} priority:${task.priority} due:${task.due_date || 'none'} est:${task.estimated_minutes || 'n/a'}`,
  )
  return lines.join('\n')
}

function parseSuggestions(text) {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const raw = match ? match[1] : text

  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
    if (Array.isArray(parsed?.suggestions)) return parsed.suggestions
  } catch {
    return []
  }

  return []
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { client, user } = await requireUser(req)
    const { listId = null, spaceId = null } = req.body || {}

    let query = client
      .from('tasks')
      .select('id, title, status, priority, due_date, estimated_minutes, list_id, space_id')
      .eq('user_id', user.id)
      .in('status', ['inbox', 'todo', 'in_progress'])

    if (listId) query = query.eq('list_id', listId)
    else if (spaceId) query = query.eq('space_id', spaceId)

    const { data: tasks, error } = await query.order('due_date', { ascending: true, nullsFirst: false })
    if (error) throw error

    const admin = getAdminClient()
    const { text } = await chatWithProviderChain(admin, {
      maxTokens: 700,
      messages: [
        {
          role: 'system',
          content:
            'You suggest due dates for open tasks. Return ONLY valid JSON array: [{ "taskId": "uuid", "suggestedDueDate": "ISO8601", "reason": "short" }]. Use Asia/Manila context. Spread work realistically.',
        },
        {
          role: 'user',
          content: `Suggest schedule for these tasks:\n${buildSchedulePrompt(tasks || [])}`,
        },
      ],
    })

    const suggestions = parseSuggestions(text)
      .filter((item) => item?.taskId && item?.suggestedDueDate)
      .map((item) => {
        const task = (tasks || []).find((row) => row.id === item.taskId)
        return {
          taskId: item.taskId,
          suggestedDueDate: item.suggestedDueDate,
          reason: task ? `${task.title}: ${item.reason || 'Suggested by AI'}` : item.reason || 'Suggested by AI',
        }
      })

    return res.status(200).json({ suggestions, taskCount: tasks?.length || 0 })
  } catch (error) {
    const status = error.status || 500
    return res.status(status).json({ error: error.message || 'Schedule failed' })
  }
}
