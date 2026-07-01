import { buildDailyReminderMessage, fetchReminderTasks } from '../../lib/server/buildReminder.js'
import { getAdminClient, resolveUserId } from '../../lib/server/supabaseAdmin.js'
import { sendTelegramMessage } from '../../lib/server/telegram.js'

function isAuthorized(req) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false

  return req.headers.authorization === `Bearer ${cronSecret}`
}

function countDueToday(tasks) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setHours(23, 59, 59, 999)

  return tasks.filter((task) => {
    const dueDate = task.due_date ? new Date(task.due_date) : null
    return dueDate && dueDate >= start && dueDate <= end
  }).length
}

function countOverdue(tasks) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  return tasks.filter((task) => {
    const dueDate = task.due_date ? new Date(task.due_date) : null
    return dueDate && dueDate < start
  }).length
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).send('Method not allowed')
  }

  if (!isAuthorized(req)) {
    return res.status(401).send('Unauthorized')
  }

  try {
    const supabase = getAdminClient()
    const userId = await resolveUserId(supabase)
    const tasks = await fetchReminderTasks(supabase, userId)
    const message = buildDailyReminderMessage(tasks)

    await sendTelegramMessage(message)

    return res.status(200).json({
      ok: true,
      sent: true,
      dueToday: countDueToday(tasks),
      overdue: countOverdue(tasks),
    })
  } catch (error) {
    console.error('daily-reminder failed', error)
    return res.status(500).json({ ok: false, error: error.message })
  }
}
