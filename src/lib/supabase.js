import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const allowedEmail = import.meta.env.VITE_ALLOWED_EMAIL?.trim().toLowerCase()

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
export const configuredAllowedEmail = allowedEmail || ''

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
)
