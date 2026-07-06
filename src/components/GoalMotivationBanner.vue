<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { formatGoalCountdown, goalCountdown, goalTimeProgress } from '../composables/useGoals'

const props = defineProps({
  goal: {
    type: Object,
    default: null,
  },
  compact: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['go-to-goals'])

const now = ref(new Date())
let timer = null

const accent = computed(() => props.goal?.color || '#10b981')
const countdown = computed(() => goalCountdown(props.goal, now.value))
const countdownLabel = computed(() => formatGoalCountdown(props.goal, now.value))
const progress = computed(() => (props.goal ? goalTimeProgress(props.goal, now.value) : 0))

const bannerStyle = computed(() => {
  if (!props.goal) return {}
  return {
    '--goal-accent': accent.value,
    '--goal-accent-soft': `${accent.value}12`,
    '--goal-accent-border': `${accent.value}35`,
  }
})

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
  <button
    v-if="goal"
    class="goal-dashboard-banner group relative min-w-0 flex-1 overflow-hidden rounded-xl border text-left shadow-sm transition hover:shadow-md"
    :class="compact ? 'goal-dashboard-banner--compact' : 'goal-dashboard-banner--full'"
    :style="bannerStyle"
    type="button"
    @click="emit('go-to-goals')"
  >
    <div class="goal-dashboard-banner-shine pointer-events-none absolute inset-0"></div>
    <div class="goal-dashboard-banner-accent absolute left-0 top-0 h-full w-1"></div>

    <div class="relative flex min-w-0 items-center gap-3">
      <span class="goal-dashboard-icon relative grid shrink-0 place-items-center rounded-xl text-base ring-1 ring-black/5 dark:ring-white/10">
        <span class="goal-dashboard-icon-ping absolute inline-flex h-full w-full animate-ping rounded-xl opacity-30"></span>
        <span class="relative">🎯</span>
      </span>

      <div class="min-w-0 flex-1">
        <p class="goal-dashboard-eyebrow type-kicker text-[0.62rem] font-extrabold uppercase tracking-wider">
          Current goal
        </p>
        <p class="truncate text-sm font-extrabold text-slate-900 dark:text-slate-50 sm:text-[0.95rem]">
          {{ goal.title }}
        </p>
        <p
          v-if="goal.description && !compact"
          class="type-caption line-clamp-1 text-slate-500 dark:text-slate-400"
        >
          {{ goal.description }}
        </p>
        <div v-if="compact" class="goal-dashboard-mini-track mt-1.5 h-1 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700">
          <div class="h-full rounded-full transition-[width] duration-1000" :style="{ width: `${progress}%`, background: accent }"></div>
        </div>
      </div>

      <div class="goal-dashboard-countdown shrink-0 rounded-xl px-2.5 py-1.5 text-right sm:px-3">
        <p
          class="text-sm font-extrabold tabular-nums leading-none sm:text-base"
          :class="countdown.isOver ? 'text-rose-600 dark:text-rose-400' : ''"
        >
          <template v-if="countdown.isOver">Ended</template>
          <template v-else-if="countdown.days > 0">{{ countdown.days }}d {{ countdown.hours }}h</template>
          <template v-else>{{ countdown.hours }}:{{ String(countdown.minutes).padStart(2, '0') }}:{{ String(countdown.seconds).padStart(2, '0') }}</template>
        </p>
        <p class="mt-0.5 text-[0.62rem] font-bold text-slate-500 dark:text-slate-400">{{ countdownLabel }}</p>
      </div>
    </div>
  </button>

  <button
    v-else
    class="goal-dashboard-empty flex min-h-10 min-w-0 flex-1 items-center gap-3 rounded-xl border border-dashed px-3 py-2.5 text-left transition sm:px-4"
    type="button"
    @click="emit('go-to-goals')"
  >
    <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-lg ring-1 ring-amber-200/80 dark:bg-amber-500/15 dark:ring-amber-400/20">
      🎯
    </span>
    <span class="min-w-0">
      <span class="block text-sm font-extrabold text-slate-800 dark:text-slate-100">Set a motivational goal</span>
      <span class="block text-xs text-slate-500 dark:text-slate-400">Add a countdown goal to keep yourself focused.</span>
    </span>
    <span class="ml-auto hidden shrink-0 rounded-lg bg-emerald-600 px-2.5 py-1 text-[0.65rem] font-extrabold uppercase tracking-wide text-white sm:inline">
      Add
    </span>
  </button>
</template>

<style scoped>
.goal-dashboard-banner {
  border-color: var(--goal-accent-border, rgb(226 232 240));
  background: linear-gradient(135deg, #fff 0%, var(--goal-accent-soft, rgb(248 250 252)) 100%);
}

.dark .goal-dashboard-banner {
  border-color: var(--goal-accent-border, rgb(51 65 85));
  background: linear-gradient(135deg, rgb(15 23 42) 0%, color-mix(in srgb, var(--goal-accent-soft) 80%, rgb(15 23 42)) 100%);
}

.goal-dashboard-banner:hover {
  border-color: color-mix(in srgb, var(--goal-accent) 45%, rgb(226 232 240));
}

.goal-dashboard-banner--compact {
  padding: 0.65rem 0.85rem 0.65rem 1rem;
}

.goal-dashboard-banner--full {
  padding: 1rem 1.1rem 1rem 1.25rem;
}

.goal-dashboard-banner-shine {
  background: linear-gradient(120deg, transparent 30%, rgb(255 255 255 / 0.55) 50%, transparent 70%);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.group:hover .goal-dashboard-banner-shine {
  opacity: 1;
}

.dark .goal-dashboard-banner-shine {
  background: linear-gradient(120deg, transparent 30%, rgb(255 255 255 / 0.08) 50%, transparent 70%);
}

.goal-dashboard-banner-accent {
  background: var(--goal-accent, #10b981);
}

.goal-dashboard-icon {
  height: 2.25rem;
  width: 2.25rem;
  background: color-mix(in srgb, var(--goal-accent) 14%, white);
  color: var(--goal-accent);
}

.dark .goal-dashboard-icon {
  background: color-mix(in srgb, var(--goal-accent) 18%, rgb(15 23 42));
}

.goal-dashboard-icon-ping {
  background: var(--goal-accent);
}

.goal-dashboard-eyebrow {
  color: color-mix(in srgb, var(--goal-accent) 70%, rgb(100 116 139));
}

.goal-dashboard-countdown {
  background: color-mix(in srgb, var(--goal-accent) 10%, white);
  color: var(--goal-accent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--goal-accent) 18%, transparent);
}

.dark .goal-dashboard-countdown {
  background: color-mix(in srgb, var(--goal-accent) 14%, rgb(15 23 42));
}

.goal-dashboard-countdown p:first-child {
  color: color-mix(in srgb, var(--goal-accent) 85%, rgb(15 23 42));
}

.dark .goal-dashboard-countdown p:first-child {
  color: color-mix(in srgb, var(--goal-accent) 75%, white);
}

.goal-dashboard-empty {
  border-color: rgb(203 213 225);
  background: linear-gradient(135deg, rgb(248 250 252), rgb(255 255 255));
}

.goal-dashboard-empty:hover {
  border-color: rgb(52 211 153 / 0.55);
  background: linear-gradient(135deg, rgb(236 253 245), rgb(255 255 255));
}

.dark .goal-dashboard-empty {
  border-color: rgb(71 85 105);
  background: linear-gradient(135deg, rgb(30 41 59 / 0.55), rgb(15 23 42));
}

.dark .goal-dashboard-empty:hover {
  border-color: rgb(52 211 153 / 0.35);
  background: linear-gradient(135deg, rgb(6 78 59 / 0.2), rgb(15 23 42));
}
</style>
