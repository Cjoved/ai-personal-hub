import { getOpenAiToolDefinitions } from './toolSchemas.js'
import { isProviderAvailable, recordProviderUsage } from './usage.js'

const PROVIDER_ORDER = ['openrouter', 'nvidia', 'groq', 'cerebras', 'mistral']

const PROVIDER_CONFIG = {
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKey: () => process.env.OPENROUTER_API_KEY,
    model: () => process.env.OPENROUTER_MODEL || 'openrouter/free',
    headers: () => ({
      'HTTP-Referer': process.env.APP_URL || 'https://personal-tasker.vercel.app',
      'X-Title': 'Personal Tasker',
    }),
  },
  nvidia: {
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    apiKey: () => process.env.NVIDIA_API_KEY,
    model: () => process.env.NVIDIA_MODEL || 'meta/llama-3.3-70b-instruct',
    headers: () => ({}),
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKey: () => process.env.GROQ_API_KEY,
    model: () => process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    headers: () => ({}),
  },
  cerebras: {
    baseUrl: 'https://api.cerebras.ai/v1',
    apiKey: () => process.env.CEREBRAS_API_KEY,
    model: () => process.env.CEREBRAS_MODEL || 'llama-3.3-70b',
    headers: () => ({}),
  },
  mistral: {
    baseUrl: 'https://api.mistral.ai/v1',
    apiKey: () => process.env.MISTRAL_API_KEY,
    model: () => process.env.MISTRAL_MODEL || 'mistral-small-latest',
    headers: () => ({}),
  },
}

function isRateLimitError(error) {
  const message = String(error?.message || error || '').toLowerCase()
  return (
    message.includes('429')
    || message.includes('rate limit')
    || message.includes('quota')
    || message.includes('limit exceeded')
    || message.includes('insufficient')
  )
}

async function callChatCompletion(provider, { messages, maxTokens = 400, temperature = 0.4, tools = false }) {
  const config = PROVIDER_CONFIG[provider]
  const apiKey = config.apiKey()
  if (!apiKey) {
    throw new Error(`Missing API key for ${provider}`)
  }

  const body = {
    model: config.model(),
    messages,
    max_tokens: maxTokens,
    temperature,
  }

  if (tools) {
    body.tools = getOpenAiToolDefinitions()
    body.tool_choice = 'auto'
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...config.headers(),
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const responseBody = await response.text()
    throw new Error(`${provider} ${response.status}: ${responseBody.slice(0, 240)}`)
  }

  const payload = await response.json()
  const message = payload?.choices?.[0]?.message
  const text = message?.content?.trim()
  const toolCalls = message?.tool_calls || null

  if (!text && !toolCalls?.length) {
    throw new Error(`${provider} returned empty completion`)
  }

  return { text: text || '', toolCalls }
}

export async function chatWithProviderChain(supabase, options) {
  const errors = []

  for (const provider of PROVIDER_ORDER) {
    const config = PROVIDER_CONFIG[provider]
    if (!config.apiKey()) {
      errors.push(`${provider}: missing API key`)
      continue
    }

    try {
      const available = supabase ? await isProviderAvailable(supabase, provider) : true
      if (!available) {
        errors.push(`${provider}: monthly limit reached`)
        continue
      }

      const result = await callChatCompletion(provider, options)
      if (supabase) await recordProviderUsage(supabase, provider)
      return { ...result, provider }
    } catch (error) {
      errors.push(`${provider}: ${error.message}`)
      if (!isRateLimitError(error)) continue
    }
  }

  const error = new Error(`All AI providers failed: ${errors.join(' | ')}`)
  error.code = 'ALL_PROVIDERS_EXHAUSTED'
  throw error
}
