import { verifyPendingAction } from '../../lib/server/ai/pendingAction.js'
import { executeWriteTool } from '../../lib/server/ai/toolExecutor.js'
import { fetchUserSettings, fetchWorkspaceContext } from '../../lib/server/ai/assistantTools.js'
import { requireUser } from '../../lib/server/authRequest.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { client, user } = await requireUser(req)
    const { token, confirmed = true } = req.body || {}

    if (!token) {
      return res.status(400).json({ error: 'token required' })
    }

    if (!confirmed) {
      return res.status(200).json({ reply: 'Cancelled.', mutated: false })
    }

    const payload = verifyPendingAction(token, user.id)
    if (!payload) {
      return res.status(400).json({ error: 'Pending action expired or invalid. Ask again.' })
    }

    const settings = await fetchUserSettings(client, user.id)
    const workspaceContext = await fetchWorkspaceContext(client, user.id, settings.timezone)

    const result = await executeWriteTool(payload.tool, payload.args, {
      client,
      userId: user.id,
      context: workspaceContext,
    })

    if (!result.ok) {
      return res.status(400).json({ error: result.message })
    }

    return res.status(200).json({
      reply: result.message,
      mutated: Boolean(result.mutated),
    })
  } catch (error) {
    const status = error.status || 500
    return res.status(status).json({ error: error.message || 'Apply failed' })
  }
}
