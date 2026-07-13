<script setup>
import { computed, onMounted, ref, watch } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  type: {
    type: String,
    default: 'line',
    validator: (value) => ['line', 'bar'].includes(value),
  },
  valueSuffix: {
    type: String,
    default: '%',
  },
  valueKey: {
    type: String,
    default: 'value',
  },
  maxValue: {
    type: Number,
    default: null,
  },
  color: {
    type: String,
    default: '#0d9488',
  },
  emptyLabel: {
    type: String,
    default: 'Not enough data yet.',
  },
  height: {
    type: Number,
    default: 220,
  },
})

const uid = `habit-chart-${Math.random().toString(36).slice(2, 9)}`
const hoveredIndex = ref(null)
const reveal = ref(0)
const rootRef = ref(null)

const pad = { top: 18, right: 14, bottom: 34, left: 36 }
const width = 520
const plotW = width - pad.left - pad.right
const plotH = computed(() => props.height - pad.top - pad.bottom)

const points = computed(() => {
  const rows = props.items || []
  const ceiling = props.maxValue ?? Math.max(100, ...rows.map((item) => Number(item[props.valueKey]) || 0), 1)
  const count = Math.max(rows.length, 1)

  return rows.map((item, index) => {
    const raw = Number(item[props.valueKey]) || 0
    const x = pad.left + (count === 1 ? plotW / 2 : (index / (count - 1)) * plotW)
    const y = pad.top + plotH.value - (raw / ceiling) * plotH.value
    return {
      ...item,
      index,
      raw,
      x,
      y,
      label: item.label,
      sublabel: item.sublabel || '',
      ceiling,
    }
  })
})

const yTicks = computed(() => {
  const ceiling = points.value[0]?.ceiling || 100
  return [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    value: Math.round(ceiling * ratio),
    y: pad.top + plotH.value - ratio * plotH.value,
  }))
})

const linePath = computed(() => {
  if (points.value.length < 2) return ''
  return points.value.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ')
})

const areaPath = computed(() => {
  if (points.value.length < 2) return ''
  const baseline = pad.top + plotH.value
  const first = points.value[0]
  const last = points.value[points.value.length - 1]
  return `${linePath.value} L${last.x},${baseline} L${first.x},${baseline} Z`
})

const barWidth = computed(() => {
  const count = Math.max(points.value.length, 1)
  return Math.max(10, Math.min(42, (plotW / count) * 0.55))
})

const activePoint = computed(() =>
  hoveredIndex.value == null ? null : points.value[hoveredIndex.value] || null,
)

const tooltipStyle = computed(() => {
  if (!activePoint.value) return {}
  const leftPct = (activePoint.value.x / width) * 100
  return {
    left: `${leftPct}%`,
    transform: 'translateX(-50%)',
  }
})

function onMove(event) {
  if (!points.value.length || !rootRef.value) return
  const rect = rootRef.value.getBoundingClientRect()
  const ratio = (event.clientX - rect.left) / rect.width
  const x = pad.left + ratio * plotW
  let nearest = 0
  let best = Infinity
  points.value.forEach((point, index) => {
    const dist = Math.abs(point.x - x)
    if (dist < best) {
      best = dist
      nearest = index
    }
  })
  hoveredIndex.value = nearest
}

function onLeave() {
  hoveredIndex.value = null
}

function animateIn() {
  reveal.value = 0
  const start = performance.now()
  const duration = 650
  function frame(now) {
    const t = Math.min(1, (now - start) / duration)
    const eased = 1 - (1 - t) ** 3
    reveal.value = eased
    if (t < 1) requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

onMounted(animateIn)
watch(
  () => props.items,
  () => animateIn(),
  { deep: true },
)
</script>

<template>
  <div v-if="!items.length" class="py-8 text-center text-sm text-slate-500">{{ emptyLabel }}</div>

  <div
    v-else
    ref="rootRef"
    class="habit-live-chart"
    @mousemove="onMove"
    @mouseleave="onLeave"
    @touchmove.prevent="onMove($event.touches[0])"
    @touchend="onLeave"
  >
    <div v-if="activePoint" class="habit-live-chart__tooltip" :style="tooltipStyle">
      <strong>{{ activePoint.label }}</strong>
      <span>{{ activePoint.raw }}{{ valueSuffix }}</span>
      <small v-if="activePoint.sublabel">{{ activePoint.sublabel }}</small>
    </div>

    <svg
      class="habit-live-chart__svg"
      :viewBox="`0 0 ${width} ${height}`"
      role="img"
      :aria-label="`Live chart with ${items.length} points`"
    >
      <defs>
        <linearGradient :id="`${uid}-fill`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="color" stop-opacity="0.35" />
          <stop offset="100%" :stop-color="color" stop-opacity="0.02" />
        </linearGradient>
        <linearGradient :id="`${uid}-bar`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="color" />
          <stop offset="100%" stop-color="#ea580c" />
        </linearGradient>
      </defs>

      <g class="habit-live-chart__grid">
        <line
          v-for="tick in yTicks"
          :key="`g-${tick.value}`"
          :x1="pad.left"
          :x2="width - pad.right"
          :y1="tick.y"
          :y2="tick.y"
        />
        <text
          v-for="tick in yTicks"
          :key="`t-${tick.value}`"
          :x="pad.left - 8"
          :y="tick.y + 4"
          text-anchor="end"
        >
          {{ tick.value }}
        </text>
      </g>

      <template v-if="type === 'line'">
        <path
          class="habit-live-chart__area"
          :d="areaPath"
          :fill="`url(#${uid}-fill)`"
          :style="{ opacity: reveal }"
        />
        <path
          class="habit-live-chart__line"
          :d="linePath"
          :stroke="color"
          fill="none"
          :style="{
            strokeDasharray: 1200,
            strokeDashoffset: 1200 * (1 - reveal),
          }"
        />
        <g v-for="point in points" :key="`p-${point.index}`">
          <circle
            class="habit-live-chart__dot"
            :cx="point.x"
            :cy="point.y"
            :r="hoveredIndex === point.index ? 6.5 : 4.2"
            :fill="color"
            :style="{ opacity: reveal, transformOrigin: `${point.x}px ${point.y}px` }"
          />
          <circle
            v-if="hoveredIndex === point.index"
            :cx="point.x"
            :cy="point.y"
            r="11"
            :fill="color"
            fill-opacity="0.18"
          />
        </g>
        <line
          v-if="activePoint"
          class="habit-live-chart__crosshair"
          :x1="activePoint.x"
          :x2="activePoint.x"
          :y1="pad.top"
          :y2="pad.top + plotH"
          :stroke="color"
        />
      </template>

      <template v-else>
        <g v-for="point in points" :key="`b-${point.index}`">
          <rect
            class="habit-live-chart__bar"
            :x="point.x - barWidth / 2"
            :y="pad.top + plotH - (pad.top + plotH - point.y) * reveal"
            :width="barWidth"
            :height="Math.max(2, (pad.top + plotH - point.y) * reveal)"
            rx="6"
            :fill="hoveredIndex === point.index ? color : `url(#${uid}-bar)`"
            :opacity="hoveredIndex == null || hoveredIndex === point.index ? 1 : 0.45"
          />
        </g>
      </template>

      <g class="habit-live-chart__labels">
        <text
          v-for="point in points"
          :key="`l-${point.index}`"
          :x="point.x"
          :y="height - 12"
          text-anchor="middle"
          :class="{ 'habit-live-chart__labels--active': hoveredIndex === point.index }"
        >
          {{ point.label }}
        </text>
      </g>
    </svg>

    <p class="habit-live-chart__hint">Hover or drag across the chart for live values</p>
  </div>
</template>
