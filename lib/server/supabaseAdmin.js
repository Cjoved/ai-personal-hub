import { createClient } from '@supabase/supabase-js'
import { nodeSupabaseOptions } from './supabaseNodeOptions.js'

export function getAdminClient() {
  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(url, serviceRoleKey, nodeSupabaseOptions)
}

export async function resolveUserId(supabase) {
  const allowedEmail = process.env.ALLOWED_USER_EMAIL?.trim().toLowerCase()
  if (!allowedEmail) {
    throw new Error('Missing ALLOWED_USER_EMAIL')
  }

  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (error) throw error

  const user = data.users.find((item) => item.email?.toLowerCase() === allowedEmail)
  if (!user) {
    throw new Error(`No Supabase user found for ${allowedEmail}`)
  }

  return user.id
}
