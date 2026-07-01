import { computed, ref, watch } from 'vue'

const STORAGE_KEY = 'tasker:settings'

const defaults = {
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Manila',
  defaultSpaceId: null,
  telegramReminders: true,
  onboardingComplete: false,
}

const settings = ref({ ...defaults })
let loadedForUser = null

function readSettings(userId) {
  if (!userId) return { ...defaults }

  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${userId}`)
    return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults }
  } catch {
    return { ...defaults }
  }
}

function writeSettings(userId, snapshot) {
  if (!userId) return
  localStorage.setItem(`${STORAGE_KEY}:${userId}`, JSON.stringify(snapshot))
}

export function useSettings(user) {
  const userId = computed(() => user.value?.id)

  watch(
    userId,
    (id) => {
      if (!id) {
        settings.value = { ...defaults }
        loadedForUser = null
        return
      }

      if (loadedForUser === id) return
      settings.value = readSettings(id)
      loadedForUser = id
    },
    { immediate: true },
  )

  function update(patch) {
    settings.value = { ...settings.value, ...patch }
    writeSettings(userId.value, settings.value)
  }

  function completeOnboarding() {
    update({ onboardingComplete: true })
  }

  return {
    settings,
    timezone: computed(() => settings.value.timezone),
    defaultSpaceId: computed(() => settings.value.defaultSpaceId),
    telegramReminders: computed(() => settings.value.telegramReminders),
    onboardingComplete: computed(() => settings.value.onboardingComplete),
    update,
    completeOnboarding,
  }
}
