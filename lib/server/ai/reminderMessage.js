import { buildDailyReminderMessage, buildReminderTaskSections, reminderTaskCounts } from '../buildReminder.js'
import { formatManilaDateLabel } from '../manilaTime.js'
import { chatWithProviderChain } from './providerChain.js'
import { parseAiReminderCopy, renderAiReminderMessage } from './reminderSchema.js'

const SLOT_CONTEXT = {
  morning: 'morning check-in',
  noon: 'midday check-in',
  afternoon: 'afternoon reminder',
  night: 'evening wrap-up',
  'monthly-report': 'monthly summary',
}

export async function buildReminderMessage(tasks, { slot = 'morning', supabase, useAi = false } = {}) {
  const fixed = buildDailyReminderMessage(tasks, { slot })

  if (!useAi) return { message: fixed, source: 'fixed' }

  const taskSections = buildReminderTaskSections(tasks)
  const dateLabel = formatManilaDateLabel(new Date())
  const { overdue: overdueCount, dueToday: dueTodayCount } = reminderTaskCounts(tasks)

  try {
    const { text, provider } = await chatWithProviderChain(supabase, {
      maxTokens: 180,
      temperature: 0.2,
      jsonMode: true,
      messages: [
        {
          role: 'system',
          content:
            'Return ONLY valid JSON with keys "greeting" and "closing". '
            + 'Plain text values only — no markdown, no bullets, no task list. '
            + 'Example: {"greeting":"Good evening!","closing":"Open Personal Hub when you are ready."}',
        },
        {
          role: 'user',
          content: [
            `Write copy for a Telegram ${SLOT_CONTEXT[slot] || 'task reminder'}.`,
            `Overdue tasks: ${overdueCount}`,
            `Due today: ${dueTodayCount}`,
            'JSON only.',
          ].join('\n'),
        },
      ],
    })

    const copy = parseAiReminderCopy(text)
    if (!copy) return { message: fixed, source: 'fixed' }

    const message = renderAiReminderMessage({
      greeting: copy.greeting,
      closing: copy.closing,
      dateLabel,
      taskSections,
    })

    if (!message) return { message: fixed, source: 'fixed' }

    return { message, source: provider }
  } catch {
    return { message: fixed, source: 'fixed' }
  }
}
