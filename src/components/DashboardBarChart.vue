<script setup>
import { computed } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  title: {
    type: String,
    default: '',
  },
  valueSuffix: {
    type: String,
    default: '',
  },
  emptyLabel: {
    type: String,
    default: 'No data yet.',
  },
})

const maxValue = computed(() => Math.max(...props.items.map((item) => item.value || 0), 1))

function barWidth(value) {
  return `${Math.max(((value || 0) / maxValue.value) * 100, value ? 4 : 0)}%`
}
</script>

<template>
  <div class="space-y-3">
    <p v-if="title" class="type-chart-title type-muted">{{ title }}</p>

    <div v-for="item in items" :key="item.label" class="space-y-1.5">
      <div class="type-body-sm flex items-center justify-between gap-2 font-semibold">
        <span class="truncate text-slate-700 dark:text-slate-200">{{ item.label }}</span>
        <span class="shrink-0 tabular-nums text-slate-600 dark:text-slate-300">{{ item.value }}{{ valueSuffix }}</span>
      </div>
      <div class="dashboard-bar-track h-3 overflow-hidden rounded-full">
        <span
          class="dashboard-bar-fill block h-full rounded-full"
          :style="{
            width: barWidth(item.value),
            background: `linear-gradient(90deg, ${item.color || '#6366f1'}, color-mix(in srgb, ${item.color || '#6366f1'} 70%, white))`,
            boxShadow: `0 0 14px color-mix(in srgb, ${item.color || '#6366f1'} 35%, transparent)`,
          }"
        />
      </div>
      <p v-if="item.sublabel" class="type-meta type-muted">{{ item.sublabel }}</p>
    </div>

    <p v-if="!items.length" class="type-body-sm type-muted">{{ emptyLabel }}</p>
  </div>
</template>
