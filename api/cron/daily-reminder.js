import { buildDailyReminderMessage, fetchReminderTasks } from '../../lib/server/buildReminder.js'
import { getAdminClient, resolveUserId } from '../../lib/server/supabaseAdmin.js'
import { sendTelegramMessage } from '../../lib/server/telegram.js'

function isAuthorized(request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false

  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${cronSecret}`
}

export default async function handler(request) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  if (!isAuthorized(request)) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const supabase = getAdminClient()
    const userId = await resolveUserId(supabase)
    const tasks = await fetchReminderTasks(supabase, userId)
    const message = buildDailyReminderMessage(tasks)

    await sendTelegramMessage(message)

    return Response.json({
      ok: true,
      sent: true,
      dueToday: tasks.filter((task) => {
        const dueDate = task.due_date ? new Date(task.due_date) : null
        const start = new Date()
        start.setHours(0, 0, 0, 0)
        const end = new Date(start)
        end.setHours(23, 59, 59, 999)
        return dueDate && dueDate >= start && dueDate <= end
      }).length,
      overdue: tasks.filter((task) => {
        const dueDate = task.due_date ? new Date(task.due_date) : null
        const start = new Date()
        start.setHours(0, 0, 0, 0)
        return dueDate && dueDate < start
      }).length,
    })
  } catch (error) {
    console.error('daily-reminder failed', error)
    return Response.json({ ok: false, error: error.message }, { status: 500 })
  }
}
