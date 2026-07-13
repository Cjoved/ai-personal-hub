<script setup>
import { computed } from 'vue'
import { normalizeAssetClass } from '../lib/financeAssetClasses'

const props = defineProps({
  assetClass: {
    type: String,
    default: 'other',
  },
})

const key = computed(() => normalizeAssetClass(props.assetClass))
</script>

<template>
  <svg
    class="finance-holding-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <!-- stock: candlestick -->
    <template v-if="key === 'stock'">
      <path d="M7 4v16" />
      <path d="M12 7v13" />
      <path d="M17 3v17" />
      <rect x="5.5" y="8" width="3" height="6" rx="0.5" />
      <rect x="10.5" y="10" width="3" height="5" rx="0.5" />
      <rect x="15.5" y="6" width="3" height="8" rx="0.5" />
    </template>

    <!-- uitf: layered fund / pie -->
    <template v-else-if="key === 'uitf'">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 8 8h-8V4Z" />
      <path d="M12 12 7.5 18.5" />
    </template>

    <!-- mutual fund: briefcase -->
    <template v-else-if="key === 'mutual_fund'">
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 13h18" />
    </template>

    <!-- mp2: piggy / savings shield -->
    <template v-else-if="key === 'mp2'">
      <path d="M19 11a5 5 0 0 0-5-5H9a5 5 0 0 0-4.9 4H3v3h1.1A5 5 0 0 0 9 18h1v2h4v-2h1a5 5 0 0 0 4-2.1V16h2v-3h-1.05A4.9 4.9 0 0 0 19 11Z" />
      <circle cx="9.5" cy="11.5" r="0.8" fill="currentColor" stroke="none" />
      <path d="M16 9.5c1 .4 1.8 1.2 2.2 2.2" />
    </template>

    <!-- time deposit: vault lock -->
    <template v-else-if="key === 'time_deposit'">
      <rect x="4" y="8" width="16" height="12" rx="2" />
      <path d="M8 8V6a4 4 0 0 1 8 0v2" />
      <circle cx="12" cy="14" r="2" />
      <path d="M12 16v2" />
    </template>

    <!-- crypto: hex coin -->
    <template v-else-if="key === 'crypto'">
      <path d="M12 3 19 7.5v9L12 21l-7-4.5v-9L12 3Z" />
      <path d="M12 8v8" />
      <path d="M9.5 10.5c0-1 1.1-1.8 2.5-1.8s2.5.8 2.5 1.8-1.1 1.6-2.5 1.6-2.5.7-2.5 1.7 1.1 1.8 2.5 1.8 2.5-.8 2.5-1.8" />
    </template>

    <!-- other: simple trend -->
    <template v-else>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="m8 15 3-4 3 2 5-7" />
    </template>
  </svg>
</template>
