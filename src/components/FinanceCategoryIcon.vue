<script setup>
import { computed } from 'vue'
import { normalizeCategoryIcon } from '../lib/financeCategoryIcons'

const props = defineProps({
  icon: {
    type: String,
    default: 'other',
  },
})

const key = computed(() => normalizeCategoryIcon(props.icon))
</script>

<template>
  <svg
    class="finance-cat-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <!-- food -->
    <template v-if="key === 'food'">
      <path d="M4 11h16v2a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-2Z" />
      <path d="M8 11V7a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2" />
      <path d="M14 11V8a1.5 1.5 0 0 1 3 0v3" />
    </template>
    <!-- groceries -->
    <template v-else-if="key === 'groceries'">
      <path d="M6 7h15l-1.5 9H8L6 7Z" />
      <path d="M6 7 5 4H2" />
      <circle cx="9" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
    </template>
    <!-- transport -->
    <template v-else-if="key === 'transport'">
      <path d="M5 17h14v-5a5 5 0 0 0-5-5H10a5 5 0 0 0-5 5v5Z" />
      <path d="M5 17H3v-2M21 17h-2v-2" />
      <circle cx="7.5" cy="17" r="1.5" />
      <circle cx="16.5" cy="17" r="1.5" />
      <path d="M7 10h10" />
    </template>
    <!-- bills -->
    <template v-else-if="key === 'bills'">
      <path d="M7 3h10v18l-2-1.2L13 21l-2-1.2L9 21l-2-1.2V3Z" />
      <path d="M10 8h4M10 12h4M10 16h2" />
    </template>
    <!-- shopping -->
    <template v-else-if="key === 'shopping'">
      <path d="M6 8h12l-1 11H7L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </template>
    <!-- salary -->
    <template v-else-if="key === 'salary'">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M15.2 9.2c0-1.2-1.4-2.2-3.2-2.2S8.8 8 8.8 9.2 10.2 11.5 12 11.5s3.2 1 3.2 2.2-1.4 2.2-3.2 2.2-3.2-1-3.2-2.2" />
    </template>
    <!-- health -->
    <template v-else-if="key === 'health'">
      <path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.6-7 10-7 10Z" />
    </template>
    <!-- home -->
    <template v-else-if="key === 'home'">
      <path d="M4 11 12 4l8 7" />
      <path d="M6 10.5V20h12v-9.5" />
      <path d="M10 20v-5h4v5" />
    </template>
    <!-- entertainment -->
    <template v-else-if="key === 'entertainment'">
      <path d="M5 8h14v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      <circle cx="9.5" cy="13.5" r="1" />
      <circle cx="14.5" cy="13.5" r="1" />
    </template>
    <!-- education -->
    <template v-else-if="key === 'education'">
      <path d="M3 9.5 12 5l9 4.5-9 4.5L3 9.5Z" />
      <path d="M7 12v4.5c0 .8 2.2 2 5 2s5-1.2 5-2V12" />
      <path d="M21 10v5" />
    </template>
    <!-- travel -->
    <template v-else-if="key === 'travel'">
      <path d="M10 20 3.5 13.5 6 13l2.5 1.2L16 7l2.5-.8L21 4l-1.5 3.5L12.5 14.5 13.8 17l-.5 2.5Z" />
    </template>
    <!-- gift -->
    <template v-else-if="key === 'gift'">
      <path d="M4 12h16v8H4v-8Z" />
      <path d="M3 8h18v4H3V8Z" />
      <path d="M12 8v12" />
      <path d="M12 8c-2 0-3.5-1.2-3.5-2.5S10.5 3 12 5c1.5-2 3.5-.7 3.5.5S14 8 12 8Z" />
    </template>
    <!-- coffee -->
    <template v-else-if="key === 'coffee'">
      <path d="M6 9h10v5a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V9Z" />
      <path d="M16 10h2a2 2 0 1 1 0 4h-2" />
      <path d="M7 19h8" />
      <path d="M9 4v2M12 3v2M15 4v2" />
    </template>
    <!-- phone -->
    <template v-else-if="key === 'phone'">
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </template>
    <!-- fitness -->
    <template v-else-if="key === 'fitness'">
      <path d="M6 9v6M18 9v6M8 12h8" />
      <path d="M4 10v4M20 10v4M2 11v2M22 11v2" />
    </template>
    <!-- other / default -->
    <template v-else>
      <path d="M12 3v2M12 19v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M3 12h2M19 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      <circle cx="12" cy="12" r="3.5" />
    </template>
  </svg>
</template>
