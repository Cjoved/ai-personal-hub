<script setup>
defineProps({
  variant: {
    type: String,
    default: 'sidebar',
    validator: (value) => ['full', 'sidebar', 'mark'].includes(value),
  },
})
</script>

<template>
  <div
    class="finance-logo"
    :class="{
      'finance-logo--full': variant === 'full',
      'finance-logo--sidebar': variant === 'sidebar',
      'finance-logo--mark': variant === 'mark',
    }"
  >
    <svg
      class="finance-logo__mark"
      viewBox="0 0 300 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="finance-logo-orb" x1="40" y1="30" x2="260" y2="230" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#3B82F6" />
          <stop offset="55%" stop-color="#1E40AF" />
          <stop offset="100%" stop-color="#059669" />
        </linearGradient>
      </defs>
      <circle cx="150" cy="130" r="98" fill="url(#finance-logo-orb)" />
      <circle cx="150" cy="130" r="98" fill="white" fill-opacity="0.08" />
      <rect x="88" y="78" width="124" height="104" rx="18" fill="white" />
      <path d="M112 150 V118 H128 V150 Z" fill="#1E40AF" />
      <path d="M138 150 V102 H154 V150 Z" fill="#2563EB" />
      <path d="M164 150 V128 H180 V150 Z" fill="#059669" />
      <path d="M100 156 H200" stroke="#CBD5E1" stroke-width="4" stroke-linecap="round" />
      <circle cx="214" cy="78" r="30" fill="white" />
      <path d="M202 78 H226 M214 66 V90" stroke="#059669" stroke-width="7" stroke-linecap="round" />
    </svg>

    <div v-if="variant !== 'mark'" class="finance-logo__wordmark min-w-0">
      <p class="finance-logo__title">
        <span class="finance-logo__title-personal">Personal</span>
        <span class="finance-logo__title-finance">Finance</span>
      </p>
    </div>
  </div>
</template>
