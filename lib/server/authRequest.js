import { createClient } from '@supabase/supabase-js'
import { nodeSupabaseOptions } from './supabaseNodeOptions.js'

export function getUserFromRequest(req) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return null

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) throw new Error('Missing Supabase URL or anon key')

  const client = createClient(url, anonKey, {
    ...nodeSupabaseOptions,
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  return client
}

export async function requireUser(req) {
  const client = getUserFromRequest(req)
  if (!client) {
    const error = new Error('Unauthorized')
    error.status = 401
    throw error
  }

  const { data, error } = await client.auth.getUser()
  if (error || !data?.user) {
    const authError = new Error('Unauthorized')
    authError.status = 401
    throw authError
  }

  return { client, user: data.user }
}
