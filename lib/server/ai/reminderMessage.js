import { chatWithProviderChain } from './providerChain.js'
import { buildDailyReminderMessage } from '../buildReminder.js'

const SLOT_INTROS = {
  morning: 'Good morning! Here is your task check-in for today.',
  noon: 'Midday check-in — here is where your tasks stand.',
  afternoon: 'Afternoon reminder — tasks due and overdue.',
  night: 'Evening wrap-up — here is your task summary.',
  'monthly-report': 'Monthly cleanup completed. Here is your task summary.',
}

export async function buildReminderMessage(tasks, { slot = 'morning', supabase, useAi = false } = {}) {
  const fixed = buildDailyReminderMessage(tasks, { slot })

  if (!useAi) return { message: fixed, source: 'fixed' }

  try {
    const intro = SLOT_INTROS[slot] || SLOT_INTROS.morning
    const taskSummary = tasks
      .slice(0, 25)
      .map((task) => `- ${task.title} (${task.status}, due: ${task.due_date || 'none'})`)
      .join('\n')

    const { text, provider } = await chatWithProviderChain(supabase, {
      maxTokens: 350,
      messages: [
        {
          role: 'system',
          content:
            'You write concise Telegram task reminders. Use plain text, bullet lists, no markdown. Keep under 1200 characters.',
        },
        {
          role: 'user',
          content: `${intro}\n\nTasks:\n${taskSummary || '(no open tasks)'}\n\nWrite a friendly reminder.`,
        },
      ],
    })

    return { message: text, source: provider }
  } catch {
    return { message: fixed, source: 'fixed' }
  }
}
