import { chatWithProviderChain } from '../../../lib/server/ai/providerChain.js'
import { getAdminClient } from '../../../lib/server/supabaseAdmin.js'
import { requireUser } from '../../../lib/server/authRequest.js'

function parseJson(text) {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const raw = match ? match[1] : text
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    await requireUser(req)
    const { text, habits = [] } = req.body || {}
    if (!String(text || '').trim()) {
      return res.status(400).json({ error: 'text is required' })
    }

    const habitLines = habits
      .map(
        (h) =>
          `- id:${h.id} title:${h.title} type:${h.habit_type || 'boolean'} target:${h.target_value ?? 'n/a'} unit:${h.unit || 'n/a'}`,
      )
      .join('\n')

    const admin = getAdminClient()
    const { text: reply } = await chatWithProviderChain(admin, {
      maxTokens: 700,
      jsonMode: true,
      messages: [
        {
          role: 'system',
          content:
            'You parse natural-language habit check-ins. Return ONLY valid JSON: {"proposals":[{"habitId":"uuid","title":"string","value":number|null,"unit":"string|null","note":"string|null","reason":"short"}]}. Match only habits from the list. Extract quantities when present. If nothing matches, return {"proposals":[]}.',
        },
        {
          role: 'user',
          content: `User said: ${text}\n\nHabits:\n${habitLines || '(none)'}`,
        },
      ],
    })

    const parsed = parseJson(reply) || {}
    const proposals = Array.isArray(parsed.proposals) ? parsed.proposals : []
    const allowed = new Set(habits.map((h) => h.id))

    return res.status(200).json({
      proposals: proposals
        .filter((item) => item?.habitId && allowed.has(item.habitId))
        .map((item) => {
          const habit = habits.find((h) => h.id === item.habitId)
          return {
            habitId: item.habitId,
            title: habit?.title || item.title || 'Habit',
            value: item.value ?? null,
            unit: item.unit ?? habit?.unit ?? null,
            note: item.note || null,
            reason: item.reason || 'Matched from text',
          }
        }),
    })
  } catch (error) {
    const status = error.status || 500
    return res.status(status).json({ error: error.message || 'Habit log parse failed' })
  }
}
