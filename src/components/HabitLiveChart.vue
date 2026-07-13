<script setup>
/** @deprecated Prefer LiveTrendChart — kept as a compatibility alias. */
import LiveTrendChart from './LiveTrendChart.vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  items: { type: Array, default: () => [] },
  type: { type: String, default: 'line' },
  valueSuffix: { type: String, default: '%' },
  valueKey: { type: String, default: 'value' },
  maxValue: { type: Number, default: null },
  color: { type: String, default: '#0d9488' },
  emptyLabel: { type: String, default: 'Not enough data yet.' },
  height: { type: Number, default: 220 },
  compact: { type: Boolean, default: false },
})
</script>

<template>
  <LiveTrendChart v-bind="props" />
</template>
