<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'full',
    validator: (value) => ['full', 'sidebar', 'mark'].includes(value),
  },
  showTagline: {
    type: Boolean,
    default: null,
  },
})

const taglineVisible = computed(() => {
  if (props.showTagline !== null) return props.showTagline
  return props.variant === 'full'
})

const taglineText = computed(() =>
  props.variant === 'sidebar' ? 'Tap to switch systems' : 'Tasks · Habits · Finance',
)
</script>

<template>
  <div
    class="app-logo"
    :class="{
      'app-logo--full': variant === 'full',
      'app-logo--sidebar': variant === 'sidebar',
      'app-logo--mark': variant === 'mark',
    }"
  >
    <svg
      class="app-logo__mark"
      viewBox="-48 0 380 275"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="logo-bubble-gradient" x1="40" y1="30" x2="260" y2="210" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#3B82F6" />
          <stop offset="55%" stop-color="#4F46E5" />
          <stop offset="100%" stop-color="#7C3AED" />
        </linearGradient>

        <linearGradient id="logo-screen-gradient" x1="102" y1="90" x2="178" y2="138" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#1E293B" />
          <stop offset="100%" stop-color="#0F172A" />
        </linearGradient>

        <filter id="logo-soft-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        d="M140 30 C80 30 40 70 40 120 C40 170 80 210 140 210 L125 235 L165 210 C220 205 260 165 260 120 C260 70 220 30 140 30Z"
        fill="url(#logo-bubble-gradient)"
      />

      <path
        d="M140 30 C80 30 40 70 40 120 C40 170 80 210 140 210 L125 235 L165 210 C220 205 260 165 260 120 C260 70 220 30 140 30Z"
        fill="white"
        fill-opacity="0.08"
      />

      <rect x="85" y="75" width="110" height="80" rx="22" fill="white" />
      <rect x="102" y="90" width="76" height="48" rx="14" fill="url(#logo-screen-gradient)" />

      <circle cx="122" cy="114" r="10" fill="#22D3EE" fill-opacity="0.22" filter="url(#logo-soft-glow)" />
      <circle cx="158" cy="114" r="10" fill="#22D3EE" fill-opacity="0.22" filter="url(#logo-soft-glow)" />
      <circle cx="122" cy="114" r="7" fill="#22D3EE" />
      <circle cx="158" cy="114" r="7" fill="#22D3EE" />

      <path
        d="M128 128 Q140 138 152 128"
        stroke="#22D3EE"
        stroke-width="4"
        stroke-linecap="round"
      />

      <line x1="140" y1="75" x2="140" y2="55" stroke="white" stroke-width="5" stroke-linecap="round" />
      <circle cx="140" cy="48" r="8" fill="white" />
      <circle cx="140" cy="48" r="4" fill="#22D3EE" />

      <!-- Existing bell badge (unchanged) -->
      <circle cx="210" cy="70" r="28" fill="white" />
      <path
        d="M210 55 C202 55 197 61 197 69 V79 L192 85 H228 L223 79 V69 C223 61 218 55 210 55Z"
        fill="#4F46E5"
      />
      <circle cx="210" cy="88" r="4" fill="#4F46E5" />
      <circle class="app-logo__ping" cx="228" cy="54" r="6" fill="#FB7185" />

      <!--
        System badges in one vertical hanay.
        Only Habit (fire) overlaps the violet fill; Task + Finance sit outside left.
      -->
      <!-- Tasker — outside the violet -->
      <g transform="translate(4 72)">
        <circle r="36" fill="white" />
        <rect x="-14" y="-17" width="26" height="28" rx="4" stroke="#3B82F6" stroke-width="3.4" fill="none" />
        <path d="M-8 -8h14M-8 0h10" stroke="#3B82F6" stroke-width="3" stroke-linecap="round" />
        <path d="M-8 9 -3.5 13.5l9-9" stroke="#22D3EE" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      </g>

      <!-- Habit (fire) — only badge that kisses the violet -->
      <g transform="translate(56 148)">
        <circle r="36" fill="white" />
        <path
          d="M0 -24c-2 4.4-9 9.8-9 17.8 0 5.6 3.8 10 9 10s9-4.4 9-10c0-8-7-13.4-9-17.8Z"
          fill="#4F46E5"
        />
        <path
          d="M0 -4c-1.2 2.4-4.2 5.2-4.2 8.2 0 2.7 1.8 4.6 4.2 4.6s4.2-1.9 4.2-4.6c0-3-3-5.8-4.2-8.2Z"
          fill="#22D3EE"
          fill-opacity="0.95"
        />
      </g>

      <!-- Finance — outside the violet -->
      <g transform="translate(4 224)">
        <circle r="36" fill="white" />
        <path d="M-17 16V-16" stroke="#7C3AED" stroke-width="3.4" stroke-linecap="round" />
        <path d="M-17 16h32" stroke="#7C3AED" stroke-width="3.4" stroke-linecap="round" />
        <path d="m-10 6 7-9.5 5.5 4.5 10.5-12" stroke="#22D3EE" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      </g>
    </svg>

    <div v-if="variant !== 'mark'" class="app-logo__wordmark min-w-0">
      <p class="app-logo__title">
        <span class="app-logo__title-personal">Personal</span>
        <span class="app-logo__title-hub">Hub</span>
      </p>
      <p v-if="taglineVisible" class="app-logo__tagline">{{ taglineText }}</p>
    </div>
  </div>
</template>
