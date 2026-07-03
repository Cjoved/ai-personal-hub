import { buildReminderMessage } from '../../lib/server/ai/reminderMessage.js'
import { fetchReminderTasks } from '../../lib/server/buildReminder.js'
import { getAdminClient, resolveUserId } from '../../lib/server/supabaseAdmin.js'
import { sendTelegramMessage } from '../../lib/server/telegram.js'

const ALLOWED_SLOTS = new Set(['morning', 'noon', 'afternoon', 'night', 'monthly-report'])

function isAuthorized(req) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return req.headers.authorization === `Bearer ${cronSecret}`
}

function countDueToday(tasks) {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

  return tasks.filter((task) => {
    if (!task.due_date) return false
    const key = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(task.due_date))
    return key === today
  }).length
}

function countOverdue(tasks) {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

  return tasks.filter((task) => {
    if (!task.due_date) return false
    const key = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(task.due_date))
    return key < today
  }).length
}

async function fetchUserSettings(supabase, userId) {
  const { data, error } = await supabase
    .from('user_settings')
    .select('telegram_reminders, ai_telegram_digest')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error

  return {
    telegramReminders: data?.telegram_reminders ?? true,
    aiTelegramDigest: data?.ai_telegram_digest ?? false,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).send('Method not allowed')
  }

  if (!isAuthorized(req)) {
    return res.status(401).send('Unauthorized')
  }

  const slot = String(req.query?.slot || 'morning')
  if (!ALLOWED_SLOTS.has(slot)) {
    return res.status(400).json({ ok: false, error: 'Invalid slot' })
  }

  try {
    const supabase = getAdminClient()
    const userId = await resolveUserId(supabase)
    const settings = await fetchUserSettings(supabase, userId)

    if (!settings.telegramReminders) {
      return res.status(200).json({ ok: true, sent: false, reason: 'telegram_disabled' })
    }

    const tasks = await fetchReminderTasks(supabase, userId)
    const { message, source } = await buildReminderMessage(tasks, {
      slot,
      supabase,
      useAi: settings.aiTelegramDigest,
    })

    await sendTelegramMessage(message)

    return res.status(200).json({
      ok: true,
      sent: true,
      slot,
      source,
      dueToday: countDueToday(tasks),
      overdue: countOverdue(tasks),
    })
  } catch (error) {
    console.error('task-reminder failed', error)
    return res.status(500).json({ ok: false, error: error.message })
  }
}
