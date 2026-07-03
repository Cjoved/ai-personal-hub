import ws from 'ws'

/** Supabase client options for Node.js server routes (Vercel, vercel dev). */
export const nodeSupabaseOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  realtime: {
    transport: ws,
  },
}
