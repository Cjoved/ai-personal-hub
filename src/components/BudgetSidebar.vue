<script setup>
import AppLogo from './AppLogo.vue'
import SidebarAccountFooter from './SidebarAccountFooter.vue'

defineProps({
  activeSection: {
    type: String,
    default: 'overview',
  },
  userEmail: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['select-section', 'open-system-picker', 'close', 'open-settings', 'sign-out'])

const navItems = [
  { id: 'overview', label: 'Overview', hint: 'Totals & charts' },
  { id: 'transactions', label: 'Transactions', hint: 'Income & expenses' },
  { id: 'limits', label: 'Limits', hint: 'Category budgets' },
  { id: 'categories', label: 'Categories', hint: 'Manage groups' },
]

function navClass(isActive) {
  return isActive
    ? 'bg-white/10 text-white shadow-[inset_3px_0_0_0_rgb(34,197,94)] ring-1 ring-white/10'
    : 'text-slate-300 hover:bg-white/5 hover:text-white'
}
</script>

<template>
  <aside class="sidebar-shell flex h-full min-h-0 flex-col overflow-hidden px-3 py-4 text-slate-200 lg:h-dvh lg:w-72">
    <div class="relative mb-4 flex shrink-0 items-start justify-between gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3">
      <button
        class="min-w-0 flex-1 rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
        type="button"
        aria-label="Switch system"
        @click="emit('open-system-picker')"
      >
        <AppLogo variant="sidebar" />
        <p class="mt-2 text-[11px] font-bold uppercase tracking-wide text-emerald-300">Budget Tracker</p>
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
      <p class="type-kicker px-2 text-slate-500">Navigate</p>
      <button
        v-for="item in navItems"
        :key="item.id"
        class="type-nav flex w-full flex-col items-start rounded-xl px-3 py-2.5 transition"
        :class="navClass(activeSection === item.id)"
        type="button"
        @click="emit('select-section', item.id)"
      >
        <span class="font-semibold">{{ item.label }}</span>
        <span class="text-xs text-slate-400">{{ item.hint }}</span>
      </button>
    </nav>

    <SidebarAccountFooter
      :user-email="userEmail"
      workspace-label="Budget workspace"
      @open-settings="emit('open-settings')"
      @sign-out="emit('sign-out')"
    />
  </aside>
</template>
