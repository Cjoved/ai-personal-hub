<script setup>
defineProps({
  userEmail: {
    type: String,
    default: '',
  },
  workspaceLabel: {
    type: String,
    default: 'Personal workspace',
  },
})

const emit = defineEmits(['open-settings', 'sign-out'])
</script>

<template>
  <div class="relative mt-3 shrink-0 border-t border-white/10 pt-3">
    <div class="mb-3 flex items-center gap-2">
      <button
        class="type-body-sm flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white"
        type="button"
        title="Settings"
        @click="emit('open-settings')"
      >
        <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
        Settings
      </button>
      <button
        class="type-body-sm flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 font-semibold text-rose-200 transition hover:bg-rose-500/20 hover:text-white"
        type="button"
        title="Sign out"
        @click="emit('sign-out')"
      >
        <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
        Sign out
      </button>
    </div>

    <div class="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
      <span class="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 text-xs font-bold text-white ring-1 ring-white/10">
        {{ userEmail?.charAt(0)?.toUpperCase() || 'U' }}
        <span class="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-900 bg-emerald-400"></span>
      </span>
      <div class="min-w-0">
        <strong class="block truncate text-sm text-white">{{ userEmail || 'User' }}</strong>
        <small class="text-xs text-slate-400">{{ workspaceLabel }}</small>
      </div>
    </div>
  </div>
</template>
