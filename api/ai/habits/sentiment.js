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
    const { text } = req.body || {}
    if (!String(text || '').trim()) {
      return res.status(400).json({ error: 'text is required' })
    }

    const admin = getAdminClient()
    const { text: reply } = await chatWithProviderChain(admin, {
      maxTokens: 200,
      jsonMode: true,
      messages: [
        {
          role: 'system',
          content:
            'Classify journal sentiment. Return ONLY JSON: {"label":"positive|neutral|negative","score":0to1,"summary":"short"}.',
        },
        {
          role: 'user',
          content: text,
        },
      ],
    })

    const parsed = parseJson(reply) || {}
    return res.status(200).json({
      sentiment: {
        label: parsed.label || 'neutral',
        score: typeof parsed.score === 'number' ? parsed.score : 0.5,
        summary: parsed.summary || '',
      },
    })
  } catch (error) {
    const status = error.status || 500
    return res.status(status).json({ error: error.message || 'Sentiment failed' })
  }
}
