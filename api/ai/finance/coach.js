import { chatWithProviderChain } from '../../../lib/server/ai/providerChain.js'
import { getAdminClient } from '../../../lib/server/supabaseAdmin.js'
import { requireUser } from '../../../lib/server/authRequest.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    await requireUser(req)
    const { message = '', context = {} } = req.body || {}
    if (!String(message || '').trim()) {
      return res.status(400).json({ error: 'message is required' })
    }

    const admin = getAdminClient()
    const { text: reply } = await chatWithProviderChain(admin, {
      maxTokens: 450,
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content:
            'You are a calm personal finance coach for a PHP budget + net-worth app. Answer using the provided context only. Be brief (under 120 words). Never give buy/sell investment recommendations. Suggest budgeting habits, envelope discipline, and debt payoff order conceptually when asked.',
        },
        {
          role: 'user',
          content: `Context:\n${JSON.stringify(context)}\n\nQuestion: ${message}`,
        },
      ],
    })

    return res.status(200).json({ reply: reply || '…' })
  } catch (error) {
    const status = error.status || 500
    return res.status(status).json({ error: error.message || 'Coach failed' })
  }
}
