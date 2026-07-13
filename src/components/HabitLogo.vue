<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'sidebar',
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
  props.variant === 'sidebar' ? 'Tap to switch systems' : 'Build streaks daily',
)
</script>

<template>
  <div
    class="habit-logo"
    :class="{
      'habit-logo--full': variant === 'full',
      'habit-logo--sidebar': variant === 'sidebar',
      'habit-logo--mark': variant === 'mark',
    }"
  >
    <svg
      class="habit-logo__mark"
      viewBox="0 0 300 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="habit-logo-orb" x1="40" y1="30" x2="260" y2="230" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#2DD4BF" />
          <stop offset="48%" stop-color="#0D9488" />
          <stop offset="100%" stop-color="#D97706" />
        </linearGradient>
        <linearGradient id="habit-logo-flame" x1="150" y1="70" x2="150" y2="190" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#ECFDF5" />
          <stop offset="45%" stop-color="#5EEAD4" />
          <stop offset="100%" stop-color="#F59E0B" />
        </linearGradient>
        <filter id="habit-logo-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx="150" cy="130" r="98" fill="url(#habit-logo-orb)" />
      <circle cx="150" cy="130" r="98" fill="white" fill-opacity="0.1" />

      <!-- Streak flame -->
      <path
        d="M150 68 C132 98 118 112 118 140 C118 166 132 186 150 186 C168 186 182 166 182 140 C182 112 168 98 150 68Z"
        fill="url(#habit-logo-flame)"
        filter="url(#habit-logo-glow)"
      />
      <path
        d="M150 108 C140 124 134 132 134 146 C134 158 141 168 150 168 C159 168 166 158 166 146 C166 132 160 124 150 108Z"
        fill="#FFFBEB"
        fill-opacity="0.92"
      />

      <!-- Check badge -->
      <circle cx="214" cy="78" r="32" fill="white" />
      <path
        d="M200 78 L210 88 L230 66"
        stroke="#0F766E"
        stroke-width="8"
        stroke-linecap="round"
        stroke-linejoin="round"
        fill="none"
      />
      <circle class="habit-logo__ping" cx="236" cy="58" r="7" fill="#7C3AED" />
    </svg>

    <div v-if="variant !== 'mark'" class="habit-logo__wordmark min-w-0">
      <p class="habit-logo__title">
        <span class="habit-logo__title-habit">Habit</span>
        <span class="habit-logo__title-tracker">Tracker</span>
      </p>
      <p v-if="taglineVisible" class="habit-logo__tagline">{{ taglineText }}</p>
    </div>
  </div>
</template>
