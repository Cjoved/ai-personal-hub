<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { formatGoalCountdown, goalCountdown } from '../composables/useGoals'

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

const countdown = computed(() => goalCountdown(props.goal, now.value))
const countdownLabel = computed(() => formatGoalCountdown(props.goal, now.value))

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
    class="group relative min-w-0 flex-1 overflow-hidden rounded-xl border border-slate-200/90 bg-white text-left shadow-sm transition hover:border-emerald-300/80 hover:shadow-md dark:border-slate-600/80 dark:bg-slate-900 dark:hover:border-emerald-400/40"
    :class="compact ? 'px-3 py-2 pl-3.5 sm:px-3.5 sm:py-2.5' : 'px-4 py-3 pl-4 sm:px-5 sm:py-4'"
    type="button"
    @click="emit('go-to-goals')"
  >
    <div
      class="absolute left-0 top-0 h-full w-1"
      :style="{ background: goal.color || '#6366f1' }"
    ></div>
    <div class="relative flex min-w-0 items-center gap-3">
      <span
        class="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-base sm:h-10 sm:w-10 sm:rounded-xl"
        :style="{ background: `${goal.color || '#6366f1'}18`, color: goal.color || '#6366f1' }"
      >
        🎯
      </span>
      <div class="min-w-0 flex-1">
        <p class="type-kicker text-[0.65rem] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Current goal
        </p>
        <p class="truncate text-sm font-extrabold text-slate-900 dark:text-slate-100 sm:text-[0.95rem]">
          {{ goal.title }}
        </p>
        <p
          v-if="goal.description && !compact"
          class="type-caption line-clamp-1 text-slate-500 dark:text-slate-400"
        >
          {{ goal.description }}
        </p>
      </div>
      <div class="shrink-0 text-right">
        <p
          class="text-sm font-extrabold tabular-nums sm:text-base"
          :class="countdown.isOver ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'"
        >
          <template v-if="countdown.isOver">Ended</template>
          <template v-else-if="countdown.days > 0">{{ countdown.days }}d {{ countdown.hours }}h</template>
          <template v-else>{{ countdown.hours }}:{{ String(countdown.minutes).padStart(2, '0') }}:{{ String(countdown.seconds).padStart(2, '0') }}</template>
        </p>
        <p class="text-[0.65rem] font-bold text-slate-500 dark:text-slate-400">{{ countdownLabel }}</p>
      </div>
    </div>
  </button>

  <button
    v-else
    class="flex min-h-10 min-w-0 flex-1 items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-left transition hover:border-emerald-400/60 hover:bg-emerald-50/60 dark:border-slate-600 dark:bg-slate-800/50 dark:hover:border-emerald-400/40 dark:hover:bg-emerald-500/5 sm:px-4"
    type="button"
    @click="emit('go-to-goals')"
  >
    <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-100 text-lg dark:bg-amber-500/15">🎯</span>
    <span class="min-w-0">
      <span class="block text-sm font-extrabold text-slate-800 dark:text-slate-100">Set a motivational goal</span>
      <span class="block text-xs text-slate-500 dark:text-slate-400">Add a goal with a countdown to keep it visible on your dashboard.</span>
    </span>
  </button>
</template>
