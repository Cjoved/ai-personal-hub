<script setup>
import { computed } from 'vue'

const props = defineProps({
  segments: {
    type: Array,
    default: () => [],
  },
  centerLabel: {
    type: String,
    default: 'Total',
  },
  emptyLabel: {
    type: String,
    default: 'No data yet.',
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['md', 'lg'].includes(value),
  },
  layout: {
    type: String,
    default: 'row',
    validator: (value) => ['row', 'stack'].includes(value),
  },
})

const total = computed(() => props.segments.reduce((sum, segment) => sum + (segment.value || 0), 0))

const gradient = computed(() => {
  if (!total.value) {
    return 'conic-gradient(rgb(148 163 184 / 0.25) 0deg, rgb(148 163 184 / 0.25) 360deg)'
  }

  let cursor = 0
  const stops = props.segments
    .filter((segment) => segment.value > 0)
    .map((segment) => {
      const start = cursor
      cursor += (segment.value / total.value) * 360
      return `${segment.color} ${start}deg ${cursor}deg`
    })

  if (cursor < 360) {
    stops.push(`rgb(148 163 184 / 0.15) ${cursor}deg 360deg`)
  }

  return `conic-gradient(${stops.join(', ')})`
})
</script>

<template>
  <div
    class="dashboard-donut-layout flex w-full gap-3 sm:gap-4"
    :class="[
      size === 'lg' ? 'dashboard-donut-layout--lg' : '',
      layout === 'stack'
        ? 'flex-col items-center text-center'
        : 'items-center',
    ]"
  >
    <div
      class="dashboard-donut grid shrink-0 place-items-center rounded-full p-2.5 shadow-inner sm:p-3"
      :class="size === 'lg' ? 'dashboard-donut--lg' : ''"
      :style="{ background: gradient }"
    >
      <div class="dashboard-donut-hole grid h-full w-full place-items-center rounded-full px-2 text-center">
        <p class="type-chart-title type-muted">{{ centerLabel }}</p>
        <strong class="type-stat-md text-slate-900 dark:text-slate-100">{{ total }}</strong>
      </div>
    </div>

    <ul
      v-if="segments.length && total"
      class="min-w-0 space-y-1.5 sm:space-y-2"
      :class="layout === 'stack' ? 'w-full' : 'flex-1'"
    >
      <li
        v-for="segment in segments"
        :key="segment.label"
        class="flex items-center justify-between gap-2 rounded-lg px-1.5 py-1 transition hover:bg-slate-50/80 sm:gap-3 sm:px-2 sm:py-1.5 dark:hover:bg-slate-800/40"
      >
        <span class="flex min-w-0 items-center gap-2">
          <span
            class="h-2 w-2 shrink-0 rounded-full shadow-[0_0_8px_currentColor] sm:h-2.5 sm:w-2.5"
            :style="{ background: segment.color, color: segment.color }"
          ></span>
          <span class="type-body-sm truncate text-slate-700 dark:text-slate-200">{{ segment.label }}</span>
        </span>
        <span class="type-body-sm shrink-0 font-bold tabular-nums text-slate-800 dark:text-slate-100">
          {{ segment.value }}
          <span class="type-caption type-muted ml-1 font-medium">({{ Math.round((segment.value / total) * 100) }}%)</span>
        </span>
      </li>
    </ul>

    <p
      v-else
      class="type-body-sm type-muted"
      :class="layout === 'stack' ? 'max-w-[16rem]' : 'min-w-0 flex-1'"
    >
      {{ emptyLabel }}
    </p>
  </div>
</template>
