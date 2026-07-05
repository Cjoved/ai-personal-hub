import { z } from 'zod'

const MAX_TELEGRAM_LENGTH = 1200

export const aiReminderCopySchema = z.object({
  greeting: z.string().min(1).max(200),
  closing: z.string().min(1).max(120),
})

export function parseAiReminderCopy(text) {
  try {
    const trimmed = String(text || '').trim()
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
    const raw = fence ? fence[1].trim() : trimmed
    return aiReminderCopySchema.parse(JSON.parse(raw))
  } catch {
    return null
  }
}

export function renderAiReminderMessage({ greeting, closing, dateLabel, taskSections }) {
  const parts = [
    greeting.trim(),
    dateLabel,
    '',
    taskSections,
    '',
    closing.trim(),
  ]

  return parts.join('\n').trim().slice(0, MAX_TELEGRAM_LENGTH)
}
