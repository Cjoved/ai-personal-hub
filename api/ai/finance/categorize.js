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
    const { description = '', categories = [], type = 'expense' } = req.body || {}
    if (!String(description || '').trim()) {
      return res.status(400).json({ error: 'description is required' })
    }

    const list = categories.filter((c) => !type || c.kind === type || c.kind === 'expense')
    const lines = list.map((c) => `- id:${c.id} name:${c.name} kind:${c.kind}`).join('\n')

    const admin = getAdminClient()
    const { text: reply } = await chatWithProviderChain(admin, {
      maxTokens: 300,
      jsonMode: true,
      messages: [
        {
          role: 'system',
          content:
            'Classify a transaction description into one category. Return ONLY JSON: {"categoryId":"uuid","confidence":0-1,"reason":"short"}. Pick only from the list.',
        },
        {
          role: 'user',
          content: `Description: ${description}\nPreferred type: ${type}\n\nCategories:\n${lines || '(none)'}`,
        },
      ],
    })

    const parsed = parseJson(reply) || {}
    const allowed = new Set(list.map((c) => c.id))
    if (!parsed.categoryId || !allowed.has(parsed.categoryId)) {
      return res.status(200).json({ categoryId: null, confidence: 0, reason: 'No match' })
    }

    const category = list.find((c) => c.id === parsed.categoryId)
    return res.status(200).json({
      categoryId: parsed.categoryId,
      categoryName: category?.name,
      confidence: Number(parsed.confidence) || 0.5,
      reason: parsed.reason || 'Matched',
    })
  } catch (error) {
    const status = error.status || 500
    return res.status(status).json({ error: error.message || 'Categorize failed' })
  }
}
