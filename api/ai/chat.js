import { buildScheduleSuggestions, runAgentTurn } from '../../lib/server/ai/agentLoop.js'
import { fetchUserSettings, fetchWorkspaceContext } from '../../lib/server/ai/assistantTools.js'
import {
  getDailyChatCount,
  getDailyChatLimit,
  isDailyChatAvailable,
  recordDailyChatUsage,
} from '../../lib/server/ai/usage.js'
import { requireUser } from '../../lib/server/authRequest.js'
import { getAdminClient } from '../../lib/server/supabaseAdmin.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { client, user } = await requireUser(req)
    const { messages = [], mode = 'text' } = req.body || {}

    if (!Array.isArray(messages) || !messages.length) {
      return res.status(400).json({ error: 'messages required' })
    }

    const admin = getAdminClient()
    const settings = await fetchUserSettings(client, user.id)
    const workspaceContext = await fetchWorkspaceContext(client, user.id, settings.timezone)

    const sanitized = messages
      .slice(-12)
      .filter((message) => message?.role && message?.content)
      .map((message) => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: String(message.content).slice(0, 4000),
      }))

    const dailyOk = await isDailyChatAvailable(admin)
    if (!dailyOk) {
      const count = await getDailyChatCount(admin)
      return res.status(429).json({
        error: `AI limit for today (${count}/${getDailyChatLimit()}). Try tomorrow or use the app UI.`,
      })
    }

    const result = await runAgentTurn({
      admin,
      client,
      userId: user.id,
      messages: sanitized,
      workspaceContext,
      mode,
    })

    if (result.llmUsed) {
      await recordDailyChatUsage(admin)
    }

    return res.status(200).json({
      reply: result.reply || 'Okay.',
      pendingActions: result.pendingActions || [],
      phase: result.phase || 'chat',
      provider: result.provider,
      voiceReply: mode === 'voice',
      mutated: Boolean(result.mutated),
    })
  } catch (error) {
    const status = error.status || 500
    return res.status(status).json({ error: error.message || 'Chat failed' })
  }
}
