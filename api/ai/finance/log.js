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
    const { text, categories = [], accounts = [] } = req.body || {}
    if (!String(text || '').trim()) {
      return res.status(400).json({ error: 'text is required' })
    }

    const categoryLines = categories
      .map((c) => `- id:${c.id} name:${c.name} kind:${c.kind}`)
      .join('\n')
    const accountLines = accounts.map((a) => `- id:${a.id} name:${a.name}`).join('\n')

    const admin = getAdminClient()
    const { text: reply } = await chatWithProviderChain(admin, {
      maxTokens: 700,
      jsonMode: true,
      messages: [
        {
          role: 'system',
          content:
            'You parse natural-language personal finance transactions in PHP (₱). Return ONLY valid JSON: {"proposals":[{"amount":number,"type":"income"|"expense","categoryId":"uuid","accountId":"uuid|null","note":"string","occurred_on":"YYYY-MM-DD|null","reason":"short"}]}. Match categories from the list. Prefer expense when unclear. If nothing parseable, {"proposals":[]}.',
        },
        {
          role: 'user',
          content: `User said: ${text}\n\nCategories:\n${categoryLines || '(none)'}\n\nAccounts:\n${accountLines || '(none)'}`,
        },
      ],
    })

    const parsed = parseJson(reply) || {}
    const proposals = Array.isArray(parsed.proposals) ? parsed.proposals : []
    const allowedCats = new Set(categories.map((c) => c.id))
    const allowedAccounts = new Set(accounts.map((a) => a.id))
    const today = new Date().toISOString().slice(0, 10)

    return res.status(200).json({
      proposals: proposals
        .filter((item) => item?.categoryId && allowedCats.has(item.categoryId) && Number(item.amount) > 0)
        .map((item) => {
          const category = categories.find((c) => c.id === item.categoryId)
          return {
            amount: Number(item.amount),
            type: item.type === 'income' ? 'income' : 'expense',
            categoryId: item.categoryId,
            categoryName: category?.name || 'Category',
            accountId: item.accountId && allowedAccounts.has(item.accountId) ? item.accountId : null,
            note: item.note || null,
            occurred_on: item.occurred_on || today,
            reason: item.reason || 'Parsed from text',
          }
        }),
    })
  } catch (error) {
    const status = error.status || 500
    return res.status(status).json({ error: error.message || 'Finance log parse failed' })
  }
}
