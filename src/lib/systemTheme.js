/** Shared accents for Tasker / Habits / Finance — keep in sync with styles.css data-system. */

export const SYSTEM_IDS = ['tasker', 'habits', 'budget']

export const SYSTEM_THEMES = {
  tasker: {
    id: 'tasker',
    accent: '#10b981',
    accentSoft: 'rgb(16 185 129 / 0.18)',
    glow: 'rgb(16 185 129 / 0.35)',
  },
  habits: {
    id: 'habits',
    accent: '#0d9488',
    accentSoft: 'rgb(13 148 136 / 0.18)',
    glow: 'rgb(13 148 136 / 0.35)',
  },
  budget: {
    id: 'budget',
    accent: '#1e40af',
    accentSoft: 'rgb(30 64 175 / 0.18)',
    glow: 'rgb(30 64 175 / 0.35)',
  },
}

export function getSystemTheme(systemId) {
  return SYSTEM_THEMES[systemId] || SYSTEM_THEMES.tasker
}
