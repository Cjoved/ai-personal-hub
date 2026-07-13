import { chatWithProviderChain } from '../../../lib/server/ai/providerChain.js'
import { getAdminClient } from '../../../lib/server/supabaseAdmin.js'
import { requireUser } from '../../../lib/server/authRequest.js'

function parseJson(text) {
  const match = String(text || '').match(/```(?:json)?\s*([\s\S]*?)```/i)
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
    const { summary = {}, overLimits = [], topSpend = [] } = req.body || {}

    const admin = getAdminClient()
    const { text: reply } = await chatWithProviderChain(admin, {
      maxTokens: 500,
      jsonMode: true,
      messages: [
        {
          role: 'system',
          content:
            'You are a personal finance insights assistant for the Philippines (₱). Return ONLY JSON: {"flags":[{"severity":"info"|"warn","title":"string","message":"string"}],"suggestions":[{"title":"string","detail":"string"}]}. Be concise. No investment buy/sell advice.',
        },
        {
          role: 'user',
          content: JSON.stringify({ summary, overLimits, topSpend }),
        },
      ],
    })

    const parsed = parseJson(reply) || {}
    return res.status(200).json({
      flags: Array.isArray(parsed.flags) ? parsed.flags.slice(0, 6) : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 4) : [],
    })
  } catch (error) {
    const status = error.status || 500
    return res.status(status).json({ error: error.message || 'Insights failed' })
  }
}
