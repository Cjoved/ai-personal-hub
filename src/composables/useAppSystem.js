import { computed, ref, watch } from 'vue'

const SYSTEM_KEY = 'tasker:active-system'
const VALID_SYSTEMS = ['tasker', 'habits', 'budget']

function readSystem() {
  try {
    const saved = localStorage.getItem(SYSTEM_KEY)
    if (VALID_SYSTEMS.includes(saved)) return saved
  } catch {
    /* ignore */
  }
  return 'tasker'
}

export function useAppSystem(user) {
  const activeSystem = ref(readSystem())
  const isSystemPickerOpen = ref(false)
  const habitSection = ref('today')
  const budgetSection = ref('dashboard')

  const userId = computed(() => user?.value?.id)

  const isTasker = computed(() => activeSystem.value === 'tasker')
  const isHabits = computed(() => activeSystem.value === 'habits')
  const isBudget = computed(() => activeSystem.value === 'budget')

  const systemLabel = computed(() => {
    if (isHabits.value) return 'Habit Tracker'
    if (isBudget.value) return 'Personal Finance'
    return 'Personal Tasker'
  })

  function openSystemPicker() {
    isSystemPickerOpen.value = true
  }

  function closeSystemPicker() {
    isSystemPickerOpen.value = false
  }

  function selectSystem(system) {
    if (!VALID_SYSTEMS.includes(system)) return
    activeSystem.value = system
    isSystemPickerOpen.value = false
    if (system === 'habits') habitSection.value = 'today'
    if (system === 'budget') budgetSection.value = 'dashboard'
  }

  watch(activeSystem, (value) => {
    try {
      localStorage.setItem(SYSTEM_KEY, value)
    } catch {
      /* ignore */
    }
  })

  watch(userId, (id, prev) => {
    if (id && id !== prev) {
      activeSystem.value = readSystem()
    }
  })

  return {
    activeSystem,
    isSystemPickerOpen,
    habitSection,
    budgetSection,
    isTasker,
    isHabits,
    isBudget,
    systemLabel,
    openSystemPicker,
    closeSystemPicker,
    selectSystem,
  }
}
