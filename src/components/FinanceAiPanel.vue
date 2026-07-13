<script setup>
import { computed, ref } from 'vue'
import { supabase } from '../lib/supabase'

const props = defineProps({
  api: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['toast', 'create-from-proposal'])

const isOpen = ref(false)
const tab = ref('log')
const utterance = ref('')
const proposals = ref([])
const coachMessage = ref('')
const coachReplies = ref([])
const insights = ref({ flags: [], suggestions: [] })
const isBusy = ref(false)

const categories = computed(() => props.api.categories?.value || [])
const accounts = computed(() => props.api.activeAccounts?.value || [])

function open() {
  isOpen.value = true
}

function close() {
  isOpen.value = false
}

async function authHeaders() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Sign in required for Finance AI.')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

async function parseLog() {
  if (!utterance.value.trim() || isBusy.value) return
  isBusy.value = true
  proposals.value = []
  try {
    const headers = await authHeaders()
    const res = await fetch('/api/ai/finance/log', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        text: utterance.value.trim(),
        categories: categories.value.map((c) => ({
          id: c.id,
          name: c.name,
          kind: c.kind,
        })),
        accounts: accounts.value.map((a) => ({ id: a.id, name: a.name })),
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Parse failed')
    proposals.value = data.proposals || []
    if (!proposals.value.length) {
      emit('toast', { type: 'error', message: 'No transactions found in that text.' })
    }
  } catch (error) {
    emit('toast', { type: 'error', message: error.message || 'NL log failed.' })
  } finally {
    isBusy.value = false
  }
}

function applyProposal(proposal) {
  emit('create-from-proposal', proposal)
  proposals.value = proposals.value.filter(
    (item) =>
      !(
        item.categoryId === proposal.categoryId &&
        item.amount === proposal.amount &&
        item.occurred_on === proposal.occurred_on
      ),
  )
}

async function fetchInsights() {
  isBusy.value = true
  insights.value = { flags: [], suggestions: [] }
  try {
    const headers = await authHeaders()
    const summary = props.api.monthSummary?.value || {}
    const overLimits = (props.api.overLimitCategories?.value || []).map((row) => ({
      category: row.category.name,
      spent: row.spent,
      limit: row.limit,
    }))
    const topSpend = (props.api.categoryProgress?.value || []).slice(0, 5).map((row) => ({
      category: row.category.name,
      spent: row.spent,
    }))
    const res = await fetch('/api/ai/finance/insights', {
      method: 'POST',
      headers,
      body: JSON.stringify({ summary, overLimits, topSpend }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Insights failed')
    insights.value = {
      flags: data.flags || [],
      suggestions: data.suggestions || [],
    }
  } catch (error) {
    emit('toast', { type: 'error', message: error.message || 'Insights failed.' })
  } finally {
    isBusy.value = false
  }
}

async function sendCoach() {
  if (!coachMessage.value.trim() || isBusy.value) return
  const content = coachMessage.value.trim()
  coachMessage.value = ''
  coachReplies.value = [...coachReplies.value, { role: 'user', content }]
  isBusy.value = true
  try {
    const headers = await authHeaders()
    const res = await fetch('/api/ai/finance/coach', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: content,
        context: {
          netWorth: props.api.netWorth?.value,
          cashAssets: props.api.cashAssets?.value,
          investValue: props.api.investValue?.value,
          liabilitiesTotal: props.api.liabilitiesTotal?.value,
          monthSummary: props.api.monthSummary?.value,
          overLimits: (props.api.overLimitCategories?.value || []).length,
        },
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Coach failed')
    coachReplies.value = [...coachReplies.value, { role: 'assistant', content: data.reply || '…' }]
  } catch (error) {
    coachReplies.value = [
      ...coachReplies.value,
      { role: 'assistant', content: error.message || 'Coach unavailable.' },
    ]
  } finally {
    isBusy.value = false
  }
}

function selectTab(next) {
  tab.value = next
  if (next === 'insights' && !insights.value.flags.length && !insights.value.suggestions.length) {
    fetchInsights()
  }
}

defineExpose({ open, close })
</script>

<template>
  <div>
    <button
      class="finance-ai-fab"
      type="button"
      aria-label="Open Finance AI"
      @click="open"
    >
      <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    </button>

    <Teleport to="body">
      <div v-if="isOpen" class="finance-ai-layer">
        <button class="finance-ai-backdrop" type="button" aria-label="Close Finance AI" @click="close" />

        <section class="finance-ai-panel" role="dialog" aria-modal="true" aria-label="Finance AI">
          <header class="finance-ai-panel__header">
            <div class="min-w-0">
              <p class="finance-kicker">Finance AI</p>
              <h2 class="font-extrabold text-slate-950 dark:text-slate-50">Log · Insights · Coach</h2>
            </div>
            <button
              class="finance-modal-close !h-9 !w-9 !min-h-0 !min-w-0"
              type="button"
              aria-label="Close"
              @click="close"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </header>

          <div class="finance-ai-tabs finance-chip-group">
            <button
              class="finance-chip"
              :class="{ 'finance-chip--active': tab === 'log' }"
              type="button"
              @click="selectTab('log')"
            >
              NL log
            </button>
            <button
              class="finance-chip"
              :class="{ 'finance-chip--active': tab === 'insights' }"
              type="button"
              @click="selectTab('insights')"
            >
              Insights
            </button>
            <button
              class="finance-chip"
              :class="{ 'finance-chip--active': tab === 'coach' }"
              type="button"
              @click="selectTab('coach')"
            >
              Coach
            </button>
          </div>

          <div class="finance-ai-panel__body">
            <div v-if="tab === 'log'" class="space-y-3">
              <div class="finance-field">
                <label class="finance-label" for="finance-nl">Natural language transaction</label>
                <textarea
                  id="finance-nl"
                  v-model="utterance"
                  class="finance-input min-h-[5.5rem] resize-y"
                  rows="3"
                  placeholder='e.g. "₱450 lunch at Jollibee from GCash"'
                />
              </div>
              <button
                class="finance-primary-btn w-full"
                type="button"
                :disabled="isBusy || !utterance.trim()"
                @click="parseLog"
              >
                {{ isBusy ? 'Parsing…' : 'Parse & propose' }}
              </button>
              <ul v-if="proposals.length" class="space-y-2">
                <li
                  v-for="(proposal, index) in proposals"
                  :key="`${proposal.categoryId}-${index}`"
                  class="finance-row !p-3 flex items-center justify-between gap-2"
                >
                  <div class="min-w-0">
                    <p class="truncate text-sm font-bold">
                      {{ proposal.categoryName }}
                      <span :class="proposal.type === 'income' ? 'text-emerald-600' : 'text-rose-600'">
                        {{ proposal.type === 'income' ? '+' : '-' }}₱{{ proposal.amount }}
                      </span>
                    </p>
                    <p class="text-xs text-slate-500">{{ proposal.reason || 'Parsed from your text' }}</p>
                  </div>
                  <button
                    class="finance-ghost-btn !min-h-0 px-3 py-1.5 text-xs"
                    type="button"
                    @click="applyProposal(proposal)"
                  >
                    Add
                  </button>
                </li>
              </ul>
            </div>

            <div v-else-if="tab === 'insights'" class="space-y-3">
              <p class="text-sm text-slate-500">Flags and suggestions from your current month.</p>
              <button class="finance-primary-btn w-full" type="button" :disabled="isBusy" @click="fetchInsights">
                {{ isBusy ? 'Analyzing…' : 'Refresh insights' }}
              </button>
              <ul v-if="insights.flags.length" class="space-y-2">
                <li
                  v-for="(flag, index) in insights.flags"
                  :key="`flag-${index}`"
                  class="rounded-xl border px-3 py-2 text-sm"
                  :class="flag.severity === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200' : 'border-slate-200 dark:border-slate-700'"
                >
                  <p class="font-bold">{{ flag.title }}</p>
                  <p class="text-xs opacity-80">{{ flag.message }}</p>
                </li>
              </ul>
              <ul v-if="insights.suggestions.length" class="space-y-2">
                <li
                  v-for="(item, index) in insights.suggestions"
                  :key="`sug-${index}`"
                  class="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700"
                >
                  <p class="text-sm font-bold">{{ item.title }}</p>
                  <p class="text-xs text-slate-500">{{ item.detail }}</p>
                </li>
              </ul>
            </div>

            <div v-else class="flex h-full min-h-0 flex-col gap-3">
              <div class="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-3 dark:bg-slate-950/40">
                <p v-if="!coachReplies.length" class="text-xs text-slate-500">
                  Ask about budgeting, envelopes, or debt payoff strategy.
                </p>
                <div
                  v-for="(msg, index) in coachReplies"
                  :key="index"
                  class="text-sm"
                  :class="msg.role === 'user' ? 'text-right font-semibold text-blue-800 dark:text-blue-200' : 'text-slate-700 dark:text-slate-200'"
                >
                  {{ msg.content }}
                </div>
              </div>
              <form class="flex gap-2" @submit.prevent="sendCoach">
                <input
                  v-model="coachMessage"
                  class="finance-input min-w-0 flex-1"
                  placeholder="How should I tackle my overspending?"
                />
                <button class="finance-primary-btn shrink-0" type="submit" :disabled="isBusy || !coachMessage.trim()">
                  Send
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </Teleport>
  </div>
</template>
