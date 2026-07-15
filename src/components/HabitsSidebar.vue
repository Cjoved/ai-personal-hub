<script setup>
import HabitLogo from './HabitLogo.vue'
import SidebarAccountFooter from './SidebarAccountFooter.vue'

defineProps({
  activeSection: {
    type: String,
    default: 'today',
  },
  userEmail: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['select-section', 'open-system-picker', 'close', 'open-settings', 'sign-out'])

const navItems = [
  {
    id: 'today',
    label: 'Today',
    hint: 'Check-ins',
    icon: 'today',
  },
  {
    id: 'journal',
    label: 'Journal',
    hint: 'Daily learnings',
    icon: 'journal',
  },
  {
    id: 'insights',
    label: 'Insights',
    hint: 'Streaks & charts',
    icon: 'insights',
  },
  {
    id: 'categories',
    label: 'Categories',
    hint: 'Organize habits',
    icon: 'categories',
  },
]

function navClass(isActive) {
  return isActive
    ? 'system-nav-item--active'
    : 'text-slate-300 hover:bg-white/5 hover:text-white'
}
</script>

<template>
  <aside class="sidebar-shell habits-sidebar flex h-full min-h-0 flex-col overflow-hidden px-3 py-4 text-slate-200 lg:h-dvh lg:w-72">
    <div class="habits-sidebar-brand relative mb-4 flex shrink-0 items-start justify-between gap-2 rounded-2xl border border-teal-400/30 bg-gradient-to-br from-teal-500/20 via-emerald-500/10 to-violet-500/10 p-3">
      <button
        class="min-w-0 flex-1 rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60"
        type="button"
        aria-label="Switch system"
        @click="emit('open-system-picker')"
      >
        <HabitLogo variant="sidebar" />
        <p class="mt-2 text-xs text-slate-300/80">Build streaks, one check-in at a time</p>
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
      <p class="type-kicker px-2 text-teal-200/60">Navigate</p>
      <button
        v-for="item in navItems"
        :key="item.id"
        class="type-nav flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition"
        :class="navClass(activeSection === item.id)"
        type="button"
        @click="emit('select-section', item.id)"
      >
        <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/5 text-teal-300 ring-1 ring-white/10">
          <svg v-if="item.icon === 'today'" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          <svg v-else-if="item.icon === 'journal'" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 4h11a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2Z" />
            <path d="M9 8h5M9 12h5" />
          </svg>
          <svg v-else-if="item.icon === 'insights'" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19V5M4 19h16" />
            <path d="M8 15v-4M12 15V8M16 15v-7" />
          </svg>
          <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 7h16M4 12h10M4 17h7" />
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
      workspace-label="Habit workspace"
      @open-settings="emit('open-settings')"
      @sign-out="emit('sign-out')"
    />
  </aside>
</template>
