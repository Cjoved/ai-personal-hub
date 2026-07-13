<script setup>
import AppLogo from './AppLogo.vue'
import { SYSTEM_THEMES } from '../lib/systemTheme'

defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  activeSystem: {
    type: String,
    default: 'tasker',
  },
})

const emit = defineEmits(['select', 'close'])

const systems = [
  {
    id: 'tasker',
    title: 'Personal Tasker',
    subtitle: 'Dashboard, goals, spaces, and tasks',
    accent: SYSTEM_THEMES.tasker.accent,
    icon: 'tasker',
  },
  {
    id: 'habits',
    title: 'Habit Tracker',
    subtitle: 'Daily check-ins, streaks, and routines',
    accent: SYSTEM_THEMES.habits.accent,
    icon: 'habits',
  },
  {
    id: 'budget',
    title: 'Personal Finance',
    subtitle: 'Cashflow, net worth, and investments',
    accent: SYSTEM_THEMES.budget.accent,
    icon: 'budget',
  },
]
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/60 p-4 sm:items-center"
    @click.self="emit('close')"
  >
    <div class="system-picker w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-950 p-5 text-slate-100 shadow-2xl sm:p-6">
      <div class="mb-5 flex items-start justify-between gap-3">
        <div>
          <AppLogo variant="sidebar" :show-tagline="false" />
          <p class="type-body-sm mt-3 text-slate-400">
            Personal Hub — choose a system. Each one has its own navigation.
          </p>
        </div>
        <button
          class="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-300 transition hover:bg-white/10"
          type="button"
          aria-label="Close system picker"
          @click="emit('close')"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="grid gap-3 sm:grid-cols-3">
        <button
          v-for="system in systems"
          :key="system.id"
          class="system-picker-card text-left"
          :class="{ 'system-picker-card--active': activeSystem === system.id }"
          type="button"
          :style="{ '--system-accent': system.accent }"
          @click="emit('select', system.id)"
        >
          <span class="system-picker-icon">
            <svg v-if="system.icon === 'tasker'" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M5 9.5V20h14V9.5" />
            </svg>
            <svg v-else-if="system.icon === 'habits'" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <svg v-else class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M2 10h20" />
            </svg>
          </span>
          <strong class="mt-3 block text-base font-bold text-white">{{ system.title }}</strong>
          <p class="mt-1 text-sm text-slate-400">{{ system.subtitle }}</p>
          <span
            v-if="activeSystem === system.id"
            class="mt-3 inline-flex rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            :style="{ color: system.accent }"
          >
            Current
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
