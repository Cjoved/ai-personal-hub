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
    const { habits = [], summary = {} } = req.body || {}

    const admin = getAdminClient()
    const { text: reply } = await chatWithProviderChain(admin, {
      maxTokens: 600,
      jsonMode: true,
      messages: [
        {
          role: 'system',
          content:
            'You suggest new personal habits. Return ONLY valid JSON: {"suggestions":[{"title":"string","reason":"short","habit_type":"boolean|quantity|duration","frequency":"daily|custom_days|times_per_week","target_value":number|null,"unit":"string|null"}]}. Suggest exactly 3 complementary habits not already listed. Keep suggestions realistic and non-addictive.',
        },
        {
          role: 'user',
          content: `Existing habits: ${JSON.stringify(habits)}\nSummary: ${JSON.stringify(summary)}`,
        },
      ],
    })

    const parsed = parseJson(reply) || {}
    const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : []

    return res.status(200).json({
      suggestions: suggestions.slice(0, 3).map((item) => ({
        title: item.title || 'New habit',
        reason: item.reason || 'Suggested from your patterns',
        habit_type: ['boolean', 'quantity', 'duration'].includes(item.habit_type)
          ? item.habit_type
          : 'boolean',
        frequency: item.frequency || 'daily',
        target_value: item.target_value ?? null,
        unit: item.unit || null,
      })),
    })
  } catch (error) {
    const status = error.status || 500
    return res.status(status).json({ error: error.message || 'Recommend failed' })
  }
}
