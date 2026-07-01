import { computed, ref } from 'vue'

const STORAGE_KEY = 'tasker:theme'
const theme = ref('light')

function applyTheme(mode) {
  document.documentElement.classList.toggle('dark', mode === 'dark')
  document.documentElement.style.colorScheme = mode === 'dark' ? 'dark' : 'light'
}

export function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY)
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

  if (saved === 'dark' || saved === 'light') {
    theme.value = saved
  } else {
    theme.value = prefersDark ? 'dark' : 'light'
  }

  applyTheme(theme.value)
}

export function useTheme() {
  const isDark = computed(() => theme.value === 'dark')

  function setTheme(mode) {
    theme.value = mode === 'dark' ? 'dark' : 'light'
    applyTheme(theme.value)
    localStorage.setItem(STORAGE_KEY, theme.value)
  }

  function toggleTheme() {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  return {
    theme,
    isDark,
    setTheme,
    toggleTheme,
  }
}
