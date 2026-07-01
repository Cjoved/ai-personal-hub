<script setup>
import { computed } from 'vue'
import AppSelect from './AppSelect.vue'

const props = defineProps({
  settings: {
    type: Object,
    required: true,
  },
  spaces: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update', 'close'])

const timezoneOptions = computed(() => {
  const common = ['Asia/Manila', 'UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo']
  const current = props.settings.timezone
  const values = current && !common.includes(current) ? [current, ...common] : common
  return values.map((value) => ({ value, label: value }))
})

const spaceOptions = computed(() => [
  { value: '', label: 'None (Dashboard)' },
  ...props.spaces.map((space) => ({ value: space.id, label: space.name })),
])

function update(patch) {
  emit('update', patch)
}
</script>

<template>
  <div class="settings-backdrop fixed inset-0 z-[250] grid place-items-center bg-slate-950/40 px-0 py-0 backdrop-blur-sm sm:px-4 sm:py-6">
    <section class="shell-header settings-panel w-full max-w-lg rounded-none p-5 shadow-2xl sm:rounded-2xl sm:p-6">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="type-kicker text-emerald-600">Preferences</p>
          <h2 class="type-page-title mt-1 text-slate-950 dark:text-slate-100">Settings</h2>
        </div>
        <button
          class="rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-sm font-bold text-slate-600"
          type="button"
          @click="emit('close')"
        >
          Close
        </button>
      </div>

      <div class="mt-6 space-y-5">
        <div>
          <label class="type-body-sm font-bold text-slate-700 dark:text-slate-300">Timezone</label>
          <div class="mt-2">
            <AppSelect
              :model-value="settings.timezone"
              :options="timezoneOptions"
              block
              aria-label="Timezone"
              @update:model-value="update({ timezone: $event })"
            />
          </div>
        </div>

        <div>
          <label class="type-body-sm font-bold text-slate-700 dark:text-slate-300">Default space on sign-in</label>
          <div class="mt-2">
            <AppSelect
              :model-value="settings.defaultSpaceId || ''"
              :options="spaceOptions"
              block
              aria-label="Default space"
              @update:model-value="update({ defaultSpaceId: $event || null })"
            />
          </div>
        </div>

        <label class="flex items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/50">
          <span class="type-body-sm font-semibold text-slate-700 dark:text-slate-200">Telegram daily reminders</span>
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            :checked="settings.telegramReminders"
            @change="update({ telegramReminders: $event.target.checked })"
          />
        </label>
      </div>
    </section>
  </div>
</template>
