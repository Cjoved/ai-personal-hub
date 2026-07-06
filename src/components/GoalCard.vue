<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  formatGoalCountdown,
  formatGoalDate,
  goalCountdown,
  goalTimeProgress,
} from '../composables/useGoals'

const props = defineProps({
  goal: {
    type: Object,
    required: true,
  },
  ended: {
    type: Boolean,
    default: false,
  },
  canDelete: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['edit', 'delete'])

const now = ref(new Date())
let timer = null

const accent = computed(() => props.goal.color || '#6366f1')
const countdown = computed(() => goalCountdown(props.goal, now.value))
const countdownLabel = computed(() => formatGoalCountdown(props.goal, now.value))
const progress = computed(() => goalTimeProgress(props.goal, now.value))

const cardStyle = computed(() => ({
  '--goal-accent': accent.value,
  '--goal-accent-soft': `${accent.value}14`,
  '--goal-accent-glow': `${accent.value}28`,
}))

onMounted(() => {
  timer = window.setInterval(() => {
    now.value = new Date()
  }, 1000)
})

onUnmounted(() => {
  if (timer) window.clearInterval(timer)
})
</script>

<template>
  <article
    class="goal-card group overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition hover:shadow-md dark:border-slate-700/80 dark:bg-slate-900"
    :class="ended ? 'goal-card--ended' : 'goal-card--active'"
    :style="cardStyle"
  >
    <div class="goal-card-topbar h-1" :style="{ background: accent }"></div>

    <div class="relative p-4 sm:p-5">
      <div class="goal-card-glow pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-3xl"></div>

      <div class="relative flex items-start gap-3">
        <span
          class="goal-card-icon grid h-11 w-11 shrink-0 place-items-center rounded-xl text-lg shadow-sm ring-1 ring-black/5 dark:ring-white/10"
          :style="{ background: `${accent}18`, color: accent }"
        >
          {{ ended ? '🏁' : '🎯' }}
        </span>

        <div class="min-w-0 flex-1">
          <p class="type-kicker text-[0.65rem] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {{ ended ? 'Ended goal' : 'Active goal' }}
          </p>
          <h4 class="type-card-title mt-0.5 text-slate-950 dark:text-slate-100">{{ goal.title }}</h4>
          <p v-if="goal.description" class="type-body-sm type-muted mt-1 line-clamp-2">{{ goal.description }}</p>
        </div>

        <div class="flex shrink-0 gap-1">
          <button
            v-if="!ended"
            class="goal-icon-btn goal-icon-btn--edit"
            type="button"
            title="Edit goal"
            aria-label="Edit goal"
            @click="emit('edit', goal)"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
          <button
            v-if="!ended"
            class="goal-icon-btn goal-icon-btn--lock"
            type="button"
            disabled
            title="Locked until the timeframe ends"
            aria-label="Locked until the timeframe ends"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
          </button>
          <button
            v-if="ended && canDelete"
            class="goal-icon-btn goal-icon-btn--delete"
            type="button"
            title="Delete goal"
            aria-label="Delete goal"
            @click="emit('delete', goal.id)"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
            </svg>
          </button>
        </div>
      </div>

      <div v-if="!ended" class="mt-4 space-y-2">
        <div class="flex items-end justify-between gap-3">
          <div>
            <p class="text-2xl font-extrabold tabular-nums leading-none" :style="{ color: accent }">
              <template v-if="countdown.isOver">Ended</template>
              <template v-else-if="countdown.days > 0">{{ countdown.days }}d {{ countdown.hours }}h</template>
              <template v-else>{{ countdown.hours }}:{{ String(countdown.minutes).padStart(2, '0') }}:{{ String(countdown.seconds).padStart(2, '0') }}</template>
            </p>
            <p class="type-caption type-muted mt-1">{{ countdownLabel }}</p>
          </div>
          <span
            class="rounded-full px-2.5 py-1 text-xs font-extrabold"
            :style="{ background: `${accent}18`, color: accent }"
          >
            {{ progress }}% elapsed
          </span>
        </div>

        <div class="goal-progress-track h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            class="goal-progress-fill h-full rounded-full transition-[width] duration-1000 ease-linear"
            :style="{ width: `${progress}%`, background: accent }"
          ></div>
        </div>
      </div>

      <p class="type-caption type-muted mt-4 flex flex-wrap items-center gap-1">
        <svg class="h-3.5 w-3.5 shrink-0 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        <span>{{ formatGoalDate(goal.starts_at) }} → {{ formatGoalDate(goal.ends_at) }}</span>
      </p>
    </div>
  </article>
</template>

<style scoped>
.goal-card {
  position: relative;
}

.goal-card-glow {
  background: var(--goal-accent-glow);
}

.goal-card--active {
  background: linear-gradient(165deg, #fff 0%, color-mix(in srgb, var(--goal-accent-soft) 55%, #fff) 100%);
}

.dark .goal-card--active {
  background: linear-gradient(165deg, rgb(15 23 42) 0%, color-mix(in srgb, var(--goal-accent-soft) 40%, rgb(15 23 42)) 100%);
}

.goal-card--ended {
  opacity: 0.88;
}

.goal-icon-btn {
  display: grid;
  height: 2rem;
  width: 2rem;
  place-items: center;
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  color: rgb(100 116 139);
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.dark .goal-icon-btn {
  border-color: rgb(51 65 85);
  background: rgb(30 41 59);
  color: rgb(148 163 184);
}

.goal-icon-btn--edit:hover {
  border-color: rgb(125 211 252);
  background: rgb(224 242 254);
  color: rgb(3 105 161);
}

.dark .goal-icon-btn--edit:hover {
  border-color: rgb(56 189 248 / 0.35);
  background: rgb(14 165 233 / 0.15);
  color: rgb(125 211 252);
}

.goal-icon-btn--lock:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.goal-icon-btn--delete:hover {
  border-color: rgb(251 113 133);
  background: rgb(255 228 230);
  color: rgb(190 18 60);
}

.dark .goal-icon-btn--delete:hover {
  border-color: rgb(244 63 94 / 0.35);
  background: rgb(244 63 94 / 0.15);
  color: rgb(251 113 133);
}

.goal-progress-fill {
  box-shadow: 0 0 12px var(--goal-accent-glow);
}
</style>
