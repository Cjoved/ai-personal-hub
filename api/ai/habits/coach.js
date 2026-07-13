import { chatWithProviderChain } from '../../../lib/server/ai/providerChain.js'
import { getAdminClient } from '../../../lib/server/supabaseAdmin.js'
import { requireUser } from '../../../lib/server/authRequest.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    await requireUser(req)
    const { message, context = {} } = req.body || {}
    if (!String(message || '').trim()) {
      return res.status(400).json({ error: 'message is required' })
    }

    const admin = getAdminClient()
    const { text: reply } = await chatWithProviderChain(admin, {
      maxTokens: 500,
      messages: [
        {
          role: 'system',
          content:
            'You are a supportive habit coach. Use the user habit context to give short, personalized, non-manipulative advice. Never invent data. Prefer concrete next actions. Keep replies under 120 words.',
        },
        {
          role: 'user',
          content: `Context JSON:\n${JSON.stringify(context)}\n\nUser message:\n${message}`,
        },
      ],
    })

    return res.status(200).json({ reply: reply || 'Keep going — one check-in at a time.' })
  } catch (error) {
    const status = error.status || 500
    return res.status(status).json({ error: error.message || 'Coach failed' })
  }
}
