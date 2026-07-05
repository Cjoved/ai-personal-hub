const MONTHLY_LIMITS = {
  gemini: Number(process.env.AI_GEMINI_MONTHLY_LIMIT || 1200),
  openrouter: Number(process.env.AI_OPENROUTER_MONTHLY_LIMIT || 1200),
  groq: Number(process.env.AI_GROQ_MONTHLY_LIMIT || 1500),
  cerebras: Number(process.env.AI_CEREBRAS_MONTHLY_LIMIT || 1500),
  nvidia: Number(process.env.AI_NVIDIA_MONTHLY_LIMIT || 1500),
  mistral: Number(process.env.AI_MISTRAL_MONTHLY_LIMIT || 1500),
}

const DAILY_CHAT_LIMIT = Number(process.env.AI_DAILY_CHAT_LIMIT || 40)
const DAILY_CHAT_PROVIDER = 'assistant_chat'

export function currentUsageMonth() {
  const now = new Date()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${now.getUTCFullYear()}-${month}`
}

export async function getUsageCount(supabase, provider, usageMonth = currentUsageMonth()) {
  const { data, error } = await supabase
    .from('ai_usage')
    .select('call_count')
    .eq('provider', provider)
    .eq('usage_month', usageMonth)
    .maybeSingle()

  if (error) throw error
  return data?.call_count ?? 0
}

export async function isProviderAvailable(supabase, provider) {
  const limit = MONTHLY_LIMITS[provider]
  if (!limit) return false
  const count = await getUsageCount(supabase, provider)
  return count < limit
}

export async function recordProviderUsage(supabase, provider) {
  const usageMonth = currentUsageMonth()
  const current = await getUsageCount(supabase, provider)

  const { error } = await supabase.from('ai_usage').upsert(
    {
      provider,
      usage_month: usageMonth,
      call_count: current + 1,
    },
    { onConflict: 'provider,usage_month' },
  )

  if (error) throw error
}

export function getMonthlyLimits() {
  return { ...MONTHLY_LIMITS }
}

export function currentUsageDay() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export async function getDailyChatCount(supabase) {
  return getUsageCount(supabase, DAILY_CHAT_PROVIDER, currentUsageDay())
}

export async function isDailyChatAvailable(supabase) {
  const count = await getDailyChatCount(supabase)
  return count < DAILY_CHAT_LIMIT
}

export async function recordDailyChatUsage(supabase) {
  const day = currentUsageDay()
  const current = await getUsageCount(supabase, DAILY_CHAT_PROVIDER, day)
  const { error } = await supabase.from('ai_usage').upsert(
    {
      provider: DAILY_CHAT_PROVIDER,
      usage_month: day,
      call_count: current + 1,
    },
    { onConflict: 'provider,usage_month' },
  )
  if (error) throw error
}

export function getDailyChatLimit() {
  return DAILY_CHAT_LIMIT
}
