import { createHmac, timingSafeEqual } from 'node:crypto'

const TTL_MS = 5 * 60 * 1000

function getSecret() {
  return process.env.AI_PENDING_SECRET || process.env.CRON_SECRET || ''
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url')
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url')
}

export function signPendingAction({ userId, tool, args, preview, destructive = false }) {
  const secret = getSecret()
  if (!secret) {
    throw new Error('AI_PENDING_SECRET or CRON_SECRET is required for pending actions')
  }

  const id = `pa_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  const payload = {
    id,
    userId,
    tool,
    args,
    preview,
    destructive: Boolean(destructive),
    exp: Date.now() + TTL_MS,
  }

  const body = base64UrlEncode(JSON.stringify(payload))
  const sig = createHmac('sha256', secret).update(body).digest('base64url')
  return { id, token: `${body}.${sig}`, preview, destructive: Boolean(destructive), tool }
}

export function verifyPendingAction(token, userId) {
  const secret = getSecret()
  if (!secret || !token) return null

  const [body, sig] = String(token).split('.')
  if (!body || !sig) return null

  const expected = createHmac('sha256', secret).update(body).digest('base64url')
  const sigBuf = Buffer.from(sig)
  const expectedBuf = Buffer.from(expected)
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null
  }

  let payload
  try {
    payload = JSON.parse(base64UrlDecode(body).toString('utf8'))
  } catch {
    return null
  }

  if (!payload?.tool || !payload?.userId || payload.userId !== userId) return null
  if (!payload.exp || Date.now() > payload.exp) return null

  return payload
}
