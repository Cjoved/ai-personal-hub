<script setup>
import { useToast } from '../composables/useToast'

const { toasts, dismiss } = useToast()

const toneClass = {
  success: 'border-emerald-200/90 bg-emerald-50 text-emerald-900',
  error: 'border-rose-200/90 bg-rose-50 text-rose-900',
}

function handleAction(toast) {
  toast.onAction?.()
  dismiss(toast.id)
}
</script>

<template>
  <div class="pointer-events-none fixed bottom-4 right-4 z-[300] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg shadow-slate-900/10 backdrop-blur-sm"
      :class="toneClass[toast.type] || toneClass.error"
      role="status"
    >
      <span class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/70 text-xs font-black">
        {{ toast.type === 'success' ? '✓' : '!' }}
      </span>
      <p class="min-w-0 flex-1 text-sm font-semibold leading-snug">{{ toast.message }}</p>
      <button
        v-if="toast.actionLabel"
        class="shrink-0 rounded-md border border-current/20 px-2 py-1 text-xs font-bold"
        type="button"
        @click="handleAction(toast)"
      >
        {{ toast.actionLabel }}
      </button>
      <button
        class="shrink-0 rounded-md px-1 text-xs font-bold opacity-60 transition hover:opacity-100"
        type="button"
        aria-label="Dismiss notification"
        @click="dismiss(toast.id)"
      >
        ×
      </button>
    </div>
  </div>
</template>
