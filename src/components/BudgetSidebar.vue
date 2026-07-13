<script setup>
import FinanceLogo from './FinanceLogo.vue'
import SidebarAccountFooter from './SidebarAccountFooter.vue'

defineProps({
  activeSection: {
    type: String,
    default: 'dashboard',
  },
  userEmail: {
    type: String,
    default: '',
  },
})

const emit = defineEmits([
  'select-section',
  'open-system-picker',
  'close',
  'open-settings',
  'sign-out',
])

const navItems = [
  { id: 'dashboard', label: 'Home', hint: 'Overview & cashflow', icon: 'dashboard' },
  { id: 'activity', label: 'Activity', hint: 'Transactions & accounts', icon: 'activity' },
  { id: 'budget', label: 'Budget', hint: 'Limits & recurring', icon: 'budget' },
  { id: 'networth', label: 'Net worth', hint: 'Investments & debts', icon: 'networth' },
  { id: 'goals', label: 'Goals', hint: 'Savings targets', icon: 'goals' },
]

function navClass(isActive) {
  return isActive
    ? 'bg-white/10 text-white shadow-[inset_3px_0_0_0_rgb(30,64,175)] ring-1 ring-blue-400/25'
    : 'text-slate-300 hover:bg-white/5 hover:text-white'
}

function resolveActive(section, id) {
  if (id === 'dashboard') {
    return section === 'dashboard' || section === 'overview'
  }
  if (id === 'activity') {
    return ['activity', 'transactions', 'accounts'].includes(section)
  }
  if (id === 'budget') {
    return ['budget', 'budgets', 'limits', 'subscriptions'].includes(section)
  }
  if (id === 'networth') {
    return ['networth', 'wealth', 'investments', 'debts'].includes(section)
  }
  return section === id
}
</script>

<template>
  <aside class="sidebar-shell finance-sidebar flex h-full min-h-0 flex-col overflow-hidden px-3 py-4 text-slate-200 lg:h-dvh lg:w-72">
    <div class="relative mb-4 flex shrink-0 items-start justify-between gap-2 rounded-2xl border border-blue-400/30 bg-gradient-to-br from-blue-500/20 via-emerald-500/10 to-transparent p-3">
      <button
        class="min-w-0 flex-1 rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"
        type="button"
        aria-label="Switch system"
        @click="emit('open-system-picker')"
      >
        <FinanceLogo variant="sidebar" />
        <p class="mt-2 text-xs text-slate-300/80">Cashflow, net worth, investments</p>
      </button>
      <button
        class="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-300 lg:hidden"
        type="button"
        aria-label="Close navigation"
        @click="emit('close')"
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>

    <nav class="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
      <p class="type-kicker px-2 text-blue-200/50">Navigate</p>
      <button
        v-for="item in navItems"
        :key="item.id"
        class="type-nav flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition"
        :class="navClass(resolveActive(activeSection, item.id))"
        type="button"
        @click="emit('select-section', item.id)"
      >
        <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/5 text-blue-300 ring-1 ring-white/10">
          <svg v-if="item.icon === 'dashboard'" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 13h7V4H4v9Zm9 7h7V4h-7v16ZM4 20h7v-5H4v5Z" />
          </svg>
          <svg v-else-if="item.icon === 'activity'" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 7h12M4 7h.01M8 12h12M4 12h.01M8 17h12M4 17h.01" />
          </svg>
          <svg v-else-if="item.icon === 'budget'" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19V5M4 19h16" />
            <path d="M8 15v-4M12 15V8M16 15v-7" />
          </svg>
          <svg v-else-if="item.icon === 'networth'" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 17l6-6 4 4 7-8" />
            <path d="M14 7h6v6" />
          </svg>
          <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="8" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="12" cy="12" r="1" />
          </svg>
        </span>
        <span class="min-w-0 text-left">
          <span class="block font-semibold">{{ item.label }}</span>
          <span class="block text-xs text-slate-400">{{ item.hint }}</span>
        </span>
      </button>
    </nav>

    <SidebarAccountFooter
      :user-email="userEmail"
      workspace-label="Finance workspace"
      @open-settings="emit('open-settings')"
      @sign-out="emit('sign-out')"
    />
  </aside>
</template>
